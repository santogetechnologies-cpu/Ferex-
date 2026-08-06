import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Folder, Search, Upload, Eye, RefreshCw, FileText, CheckCircle2, AlertCircle, Clock, X } from 'lucide-react';
import { Card } from '../components/Card';
import { Button } from '../components/Button';

export const Documents: React.FC = () => {
  // In-memory files state
  const [documents, setDocuments] = useState([
    { id: 1, name: 'Passport_Sarah_Jenkins.pdf', type: 'Identification', size: '1.4 MB', date: 'Jul 28, 2026', status: 'Approved' },
    { id: 2, name: 'TOEFL_IBT_Official_Report.pdf', type: 'Language Test', size: '890 KB', date: 'Jul 29, 2026', status: 'Approved' },
    { id: 3, name: 'HighSchool_Transcript_Unified.pdf', type: 'Transcripts', size: '2.5 MB', date: 'Aug 01, 2026', status: 'Approved' },
    { id: 4, name: 'Recommendation_Letter_Stanford_01.pdf', type: 'Recommendation', size: '420 KB', date: 'Aug 04, 2026', status: 'Pending Verification' },
    { id: 5, name: 'Medical_Declaration_Form.pdf', type: 'Medical Check', size: '1.1 MB', date: 'Aug 05, 2026', status: 'Rejected' },
  ]);

  // Input states
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [previewDoc, setPreviewDoc] = useState<typeof documents[0] | null>(null);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploadName, setUploadName] = useState('');
  const [uploadType, setUploadType] = useState('Transcripts');
  const [toastMessage, setToastMessage] = useState('');

  // Search & Filter
  const filteredDocs = documents.filter((doc) => {
    const matchesSearch = doc.name.toLowerCase().includes(searchQuery.toLowerCase()) || doc.type.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'All' || doc.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  // Mock replace
  const handleReplace = (_id: number, docName: string) => {
    showToast(`Replacing document: ${docName}. Choose file...`);
  };

  // Mock Upload submit
  const handleUploadSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!uploadName) return;

    const newDoc = {
      id: documents.length + 1,
      name: uploadName.endsWith('.pdf') ? uploadName : `${uploadName}.pdf`,
      type: uploadType,
      size: '1.2 MB',
      date: new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: '2-digit' }),
      status: 'Pending Verification'
    };

    setDocuments([newDoc, ...documents]);
    setShowUploadModal(false);
    setUploadName('');
    showToast(`Document "${newDoc.name}" uploaded successfully!`);
  };

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(''), 3000);
  };

  return (
    <div className="space-y-6 text-left relative">
      {/* Toast */}
      <AnimatePresence>
        {toastMessage && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed top-6 right-6 z-50 bg-[#6A1B2E] text-white px-4 py-3 rounded-lg shadow-lg text-xs font-bold flex items-center gap-2"
          >
            <CheckCircle2 className="w-4 h-4 text-emerald-300" />
            {toastMessage}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight mb-1.5 flex items-center gap-2.5">
            <span className="w-8 h-8 rounded-lg bg-[#6A1B2E]/5 text-[#6A1B2E] flex items-center justify-center">
              <Folder className="w-5 h-5" />
            </span>
            Documents Manager
          </h1>
          <p className="text-sm font-semibold text-slate-500">
            Ferex Education • Secure workspace to upload, review, and verify your credentials.
          </p>
        </div>
        <Button
          size="sm"
          className="text-xs flex items-center gap-2 h-10 shadow-none font-bold"
          onClick={() => setShowUploadModal(true)}
        >
          <Upload className="w-4 h-4" /> Upload Document
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4 select-none">
        {/* Search */}
        <div className="relative flex-grow max-w-md">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search by file name or document type..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full h-11 pl-10 pr-4 rounded-lg bg-white border border-slate-200 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:border-[#6A1B2E] focus:ring-2 focus:ring-[#6A1B2E]/10 transition-all"
          />
        </div>

        {/* Filter select */}
        <div className="relative min-w-[180px]">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="w-full h-11 px-3 border border-slate-200 rounded-lg bg-white text-sm font-semibold text-slate-700 focus:outline-none focus:border-[#6A1B2E]"
          >
            <option value="All">All Statuses</option>
            <option value="Approved">Approved</option>
            <option value="Pending Verification">Pending Verification</option>
            <option value="Rejected">Rejected</option>
          </select>
        </div>
      </div>

      {/* Documents Grid / Table */}
      <Card className="overflow-hidden border border-slate-100 shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm select-none">
            <thead className="bg-slate-50 text-[10px] font-extrabold uppercase text-slate-400 border-b border-slate-100">
              <tr>
                <th className="px-6 py-4">Document Details</th>
                <th className="px-6 py-4">Category</th>
                <th className="px-6 py-4">Upload Date</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-semibold">
              {filteredDocs.length > 0 ? (
                filteredDocs.map((doc) => {
                  const isApproved = doc.status === 'Approved';
                  const isPending = doc.status === 'Pending Verification';
                  
                  let badgeClass = 'bg-red-50 text-red-700 border-red-100';
                  let BadgeIcon = AlertCircle;
                  if (isApproved) {
                    badgeClass = 'bg-emerald-50 text-emerald-700 border-emerald-100';
                    BadgeIcon = CheckCircle2;
                  } else if (isPending) {
                    badgeClass = 'bg-amber-50 text-amber-700 border-amber-100';
                    BadgeIcon = Clock;
                  }

                  return (
                    <tr key={doc.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <FileText className="w-5 h-5 text-slate-400 shrink-0" />
                          <div className="flex flex-col">
                            <span className="text-slate-900 truncate max-w-[200px] sm:max-w-[320px] font-bold">
                              {doc.name}
                            </span>
                            <span className="text-[10px] text-slate-400">{doc.size}</span>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-slate-500 text-xs">
                        {doc.type}
                      </td>
                      <td className="px-6 py-4 text-slate-500 text-xs">
                        {doc.date}
                      </td>
                      <td className="px-6 py-4">
                        <div className={`inline-flex items-center gap-1 px-2.5 py-1 border rounded-full text-[9px] uppercase font-bold ${badgeClass}`}>
                          <BadgeIcon className="w-3 h-3" />
                          <span>{doc.status}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2.5">
                          <button
                            onClick={() => setPreviewDoc(doc)}
                            className="p-1 rounded-md text-slate-400 hover:text-[#6A1B2E] hover:bg-slate-100 transition-colors"
                            title="Preview File"
                          >
                            <Eye className="w-4.5 h-4.5" />
                          </button>
                          <button
                            onClick={() => handleReplace(doc.id, doc.name)}
                            className="p-1 rounded-md text-slate-400 hover:text-[#6A1B2E] hover:bg-slate-100 transition-colors"
                            title="Replace File"
                          >
                            <RefreshCw className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={5} className="py-10 text-center font-bold text-slate-400">
                    No matching documents found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* DOCUMENT PREVIEW OVERLAY MODAL */}
      <AnimatePresence>
        {previewDoc && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.4 }}
              exit={{ opacity: 0 }}
              onClick={() => setPreviewDoc(null)}
              className="fixed inset-0 bg-black"
            />
            {/* Modal */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-xl shadow-2xl overflow-hidden max-w-xl w-full relative z-10 p-6 space-y-4"
            >
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <FileText className="w-5 h-5 text-[#6A1B2E]" />
                  <h3 className="text-sm font-extrabold text-slate-900 truncate max-w-[280px]">
                    {previewDoc.name}
                  </h3>
                </div>
                <button onClick={() => setPreviewDoc(null)} className="p-1 hover:bg-slate-100 rounded text-slate-400">
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Simulated PDF structure */}
              <div className="border border-slate-100 bg-slate-50/50 rounded-lg p-8 flex flex-col items-center justify-center h-[280px]">
                <FileText className="w-16 h-16 text-slate-300 mb-4" />
                <p className="text-xs text-slate-400 font-bold">Secure PDF Document Viewer (Mock)</p>
                <p className="text-[10px] text-slate-400 mt-1">Verified signature code: SHA-256/f7x890412e</p>
                <div className="w-48 h-2 rounded bg-slate-200/80 overflow-hidden mt-6">
                  <div className="w-full h-full bg-[#6A1B2E]/20" />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-3">
                <Button size="sm" variant="outline" className="text-xs font-bold" onClick={() => setPreviewDoc(null)}>
                  Close
                </Button>
                <Button size="sm" className="text-xs font-bold" onClick={() => handleReplace(previewDoc.id, previewDoc.name)}>
                  Replace File
                </Button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* FILE UPLOAD MODAL */}
      <AnimatePresence>
        {showUploadModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.4 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowUploadModal(false)}
              className="fixed inset-0 bg-black"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-xl shadow-2xl overflow-hidden max-w-md w-full relative z-10 p-6 space-y-4"
            >
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <h3 className="text-sm font-extrabold text-slate-900">Upload Academic Document</h3>
                <button onClick={() => setShowUploadModal(false)} className="p-1 hover:bg-slate-100 rounded text-slate-400">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleUploadSubmit} className="space-y-4 text-xs font-semibold">
                <div>
                  <label className="block text-slate-500 mb-1.5">Document File Name</label>
                  <input
                    type="text"
                    placeholder="e.g. IELTS_Report_Card"
                    value={uploadName}
                    onChange={(e) => setUploadName(e.target.value)}
                    required
                    className="w-full h-10 px-3.5 border border-slate-200 rounded-lg text-slate-900 bg-white placeholder-slate-400 focus:outline-none focus:border-[#6A1B2E]"
                  />
                </div>

                <div>
                  <label className="block text-slate-500 mb-1.5">Document Category</label>
                  <select
                    value={uploadType}
                    onChange={(e) => setUploadType(e.target.value)}
                    className="w-full h-10 px-3 border border-slate-200 rounded-lg bg-white text-slate-700 focus:outline-none focus:border-[#6A1B2E]"
                  >
                    <option value="Identification">Identification (Passport / ID)</option>
                    <option value="Language Test">Language Test (TOEFL / IELTS)</option>
                    <option value="Transcripts">Academic Transcripts</option>
                    <option value="Recommendation">Letters of Recommendation</option>
                    <option value="Other">Other Certificate</option>
                  </select>
                </div>

                {/* Drag and Drop Mock */}
                <div className="border-2 border-dashed border-slate-200 rounded-lg p-6 flex flex-col items-center justify-center hover:border-primary/50 transition-colors cursor-pointer bg-slate-50/50">
                  <Upload className="w-8 h-8 text-slate-400 mb-2" />
                  <span className="text-xs text-slate-500">Drag files here or click to browse</span>
                  <span className="text-[10px] text-slate-400 mt-1">Supports PDF, JPG, PNG up to 10MB</span>
                </div>

                <div className="flex justify-end gap-3 pt-3">
                  <Button type="button" variant="outline" size="sm" className="text-xs" onClick={() => setShowUploadModal(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" size="sm" className="text-xs">
                    Submit File
                  </Button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
};
