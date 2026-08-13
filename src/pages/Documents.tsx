import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Folder, Search, Upload, Eye, FileText, CheckCircle2, X, MessageSquare } from 'lucide-react';
import { Card } from '../components/Card';
import { Button } from '../components/Button';
import { useAuth } from '../contexts/AuthContext';
import { useDocuments } from '../hooks/useDocuments';

export const Documents: React.FC = () => {
  const { user } = useAuth();
  const { documents: dbDocs, loading, addDoc, replaceDoc } = useDocuments(user?.id);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Map DB docs or fall back to empty list if none
  const documents = dbDocs.map(d => ({
    id: d.id,
    name: d.file_name,
    type: d.doc_type,
    size: d.file_size || '1.2 MB',
    date: new Date(d.uploaded_at || Date.now()).toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' }),
    status: d.status,
    reviewerNotes: d.reviewer_notes || '',
  }));

  // Input states
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [previewDoc, setPreviewDoc] = useState<any | null>(null);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [reuploadTargetDocId, setReuploadTargetDocId] = useState<string | null>(null);
  const [uploadName, setUploadName] = useState('');
  const [uploadType, setUploadType] = useState<any>('Transcripts');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [toastMessage, setToastMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Search & Filter
  const filteredDocs = documents.filter((doc) => {
    const matchesSearch =
      doc.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      doc.type.toLowerCase().includes(searchQuery.toLowerCase()) ||
      doc.status.toLowerCase().includes(searchQuery.toLowerCase());

    const isDocVerified = (doc.status as string) === 'Verified' || (doc.status as string) === 'Approved';
    const isDocPending = (doc.status as string) === 'Pending Verification' || (doc.status as string) === 'Pending';
    const isDocReupload = (doc.status as string) === 'Re-upload Requested';
    const isDocRejected = (doc.status as string) === 'Rejected';

    const matchesStatus =
      statusFilter === 'All' ||
      (statusFilter === 'Approved' && isDocVerified) ||
      (statusFilter === 'Verified' && isDocVerified) ||
      (statusFilter === 'Pending Verification' && isDocPending) ||
      (statusFilter === 'Re-upload Requested' && isDocReupload) ||
      (statusFilter === 'Rejected' && isDocRejected);

    return matchesSearch && matchesStatus;
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setSelectedFile(file);
      if (!uploadName) {
        setUploadName(file.name.replace(/\.[^/.]+$/, ''));
      }
    }
  };

  const handleUploadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!uploadName || !user) return;

    const baseName = uploadName.endsWith('.pdf') ? uploadName : `${uploadName}.pdf`;
    const fileSizeStr = selectedFile ? `${(selectedFile.size / (1024 * 1024)).toFixed(1)} MB` : '1.4 MB';
    const fileUrlStr = selectedFile ? URL.createObjectURL(selectedFile) : 'https://placeholder.supabase.co/' + baseName;

    try {
      setIsSubmitting(true);
      if (reuploadTargetDocId) {
        await replaceDoc(reuploadTargetDocId, {
          file_name: baseName,
          file_url: fileUrlStr,
          file_size: fileSizeStr,
          doc_type: uploadType,
        });
        showToast(`Document "${baseName}" re-uploaded successfully and submitted for review!`);
      } else {
        await addDoc({
          student_id: user.id,
          file_name: baseName,
          file_url: fileUrlStr,
          file_size: fileSizeStr,
          doc_type: uploadType,
        });
        showToast(`Document "${baseName}" submitted successfully for verification!`);
      }

      setShowUploadModal(false);
      setReuploadTargetDocId(null);
      setUploadName('');
      setSelectedFile(null);
    } catch (err: any) {
      showToast(`Error: ${err.message || 'Failed to upload'}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(''), 3000);
  };

  return (
    <div className="space-y-6 text-left relative min-h-[600px]">
      {/* Toast */}
      <AnimatePresence>
        {toastMessage && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed top-6 right-6 z-50 bg-[#6A1B2E] text-white px-4 py-3 rounded-xl shadow-lg text-xs font-bold flex items-center gap-2"
          >
            <Folder className="w-4 h-4 text-amber-300" />
            {toastMessage}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2.5">
            <span className="w-8 h-8 rounded-lg bg-[#6A1B2E]/5 text-[#6A1B2E] flex items-center justify-center">
              <Folder className="w-5 h-5" />
            </span>
            Document Vault
          </h1>
          <p className="text-xs font-semibold text-slate-500 mt-1">
            Upload and manage your required compliance, academic, and identification documents.
          </p>
        </div>

        <Button
          onClick={() => {
            setUploadName('');
            setSelectedFile(null);
            setShowUploadModal(true);
          }}
          className="flex items-center gap-2 text-xs font-bold h-10 px-4 self-start sm:self-auto shadow-sm"
        >
          <Upload className="w-4 h-4" /> Upload Document
        </Button>
      </div>

      {/* Search & Filter Bar */}
      <div className="bg-white p-3 rounded-2xl border border-slate-200/70 shadow-xs flex flex-col sm:flex-row items-center gap-3">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search documents by name, category, or status..."
            className="w-full h-10 pl-9.5 pr-4 bg-slate-50 border border-slate-200/80 rounded-xl text-xs font-semibold text-slate-900 focus:outline-none focus:border-[#6A1B2E]/40"
          />
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto">
          {['All', 'Pending Verification', 'Approved', 'Re-upload Requested', 'Rejected'].map(s => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-all ${
                statusFilter === s ? 'bg-[#6A1B2E] text-white shadow-xs' : 'bg-slate-50 text-slate-600 hover:bg-slate-100 border border-slate-200/60'
              }`}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {/* Documents Grid */}
      {loading && dbDocs.length === 0 ? (
        <div className="py-16 text-center text-xs font-bold text-slate-400">Loading document vault...</div>
      ) : filteredDocs.length === 0 ? (
        <div className="bg-white border border-slate-200/70 rounded-2xl p-12 text-center shadow-xs">
          <FileText className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <h3 className="text-sm font-black text-slate-800">No Documents Found</h3>
          <p className="text-xs font-semibold text-slate-400 mt-1 max-w-sm mx-auto mb-5">
            {searchQuery || statusFilter !== 'All'
              ? 'No documents match your current filter or search term.'
              : 'Upload your academic transcripts, passport, and certificates to proceed with university applications.'}
          </p>
          <Button
            onClick={() => setShowUploadModal(true)}
            className="inline-flex items-center gap-2 text-xs font-bold h-9 px-4"
          >
            <Upload className="w-4 h-4" /> Upload First Document
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredDocs.map((doc) => {
            const statusStr = String(doc.status || '').toLowerCase().trim();
            const notesStr = String(doc.reviewerNotes || '').toLowerCase().trim();

            const isReupload = statusStr.includes('re-upload') || statusStr.includes('reupload') || statusStr.includes('request') || notesStr.includes('re-upload') || notesStr.includes('reupload');
            const isVerified = statusStr === 'verified' || statusStr === 'approved';
            const isRejected = !isReupload && statusStr.includes('reject');
            const isPending = !isReupload && !isVerified && !isRejected;

            const displayStatus = isVerified
              ? 'Approved'
              : isReupload
              ? 'Re-upload Requested'
              : isPending
              ? 'Pending Verification'
              : isRejected
              ? 'Rejected'
              : doc.status;

            const badgeClass = isVerified
              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
              : isReupload
              ? 'bg-blue-50 text-blue-700 border-blue-200 font-bold'
              : isPending
              ? 'bg-amber-50 text-amber-700 border-amber-200'
              : isRejected
              ? 'bg-red-50 text-red-700 border-red-200'
              : 'bg-slate-50 text-slate-700 border-slate-200';

            return (
              <Card key={doc.id} className="p-5 border border-slate-200/80 hover:border-slate-300 transition-all flex flex-col justify-between bg-white relative">
                <div>
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="w-10 h-10 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center shrink-0">
                      <FileText className="w-5 h-5 text-[#6A1B2E]" />
                    </div>
                    <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border ${badgeClass}`}>
                      {displayStatus}
                    </span>
                  </div>

                  <h3 className="text-sm font-black text-slate-900 leading-snug mb-1 truncate" title={doc.name}>
                    {doc.name}
                  </h3>
                  <p className="text-xs font-bold text-slate-400 mb-3">{doc.type}</p>

                  <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-100 text-xs font-semibold text-slate-500 space-y-1">
                    <div className="flex justify-between"><span>File Size:</span><span className="font-bold text-slate-800">{doc.size}</span></div>
                    <div className="flex justify-between"><span>Uploaded:</span><span className="font-bold text-slate-800">{doc.date}</span></div>
                  </div>

                  {doc.reviewerNotes && (
                    <div className="mt-3 p-3 bg-blue-50/80 border border-blue-200/80 rounded-xl text-left">
                      <p className="text-[10px] font-extrabold uppercase tracking-wider text-blue-800 flex items-center gap-1 mb-1">
                        <MessageSquare className="w-3.5 h-3.5 text-blue-700" /> Admin Feedback Notes
                      </p>
                      <p className="text-xs font-semibold text-blue-950 leading-relaxed">{doc.reviewerNotes}</p>
                    </div>
                  )}
                </div>

                <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2 mt-4">
                  <button
                    onClick={() => setPreviewDoc(doc)}
                    className="flex items-center gap-1.5 text-xs font-bold text-[#6A1B2E] hover:underline"
                  >
                    <Eye className="w-3.5 h-3.5" /> Preview
                  </button>

                    {isReupload && (
                      <button
                        onClick={() => {
                          setReuploadTargetDocId(doc.id);
                          setUploadName(doc.name);
                          setUploadType(doc.type);
                          setShowUploadModal(true);
                        }}
                        className="h-8 px-3 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 transition-all shadow-xs"
                      >
                        <Upload className="w-3.5 h-3.5" /> Re-upload File
                      </button>
                    )}
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Upload File Modal with Real File Picker */}
      <AnimatePresence>
        {showUploadModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs" onClick={() => setShowUploadModal(false)} />
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="relative bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl border border-slate-100 z-10 text-left space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <h3 className="text-base font-black text-slate-900">Upload Compliance Document</h3>
                <button onClick={() => setShowUploadModal(false)} className="p-1.5 rounded-full hover:bg-slate-100 text-slate-400"><X className="w-4 h-4" /></button>
              </div>

              <form onSubmit={handleUploadSubmit} className="space-y-4">
                <div>
                  <label className="block text-[10px] font-extrabold uppercase text-slate-400 tracking-wider mb-1.5">Document File Name</label>
                  <input
                    type="text"
                    value={uploadName}
                    onChange={(e) => setUploadName(e.target.value)}
                    placeholder="e.g. Bachelor_Degree_Transcript"
                    required
                    className="w-full h-10 px-3.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:border-[#6A1B2E]/40"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-extrabold uppercase text-slate-400 tracking-wider mb-1.5">Document Category</label>
                  <select
                    value={uploadType}
                    onChange={(e) => setUploadType(e.target.value)}
                    className="w-full h-10 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:border-[#6A1B2E]/40"
                  >
                    <option value="Transcripts">Academic Transcripts</option>
                    <option value="Identification">Identification (Passport / ID)</option>
                    <option value="Language Test">Language Test (IELTS / TOEFL)</option>
                    <option value="Recommendation">Letter of Recommendation (LOR)</option>
                    <option value="Other">Other Certificate / SOP</option>
                  </select>
                </div>

                {/* 📂 Native File Input Picker */}
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                  className="hidden"
                />

                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="p-6 border-2 border-dashed border-slate-200 hover:border-[#6A1B2E]/40 rounded-2xl bg-slate-50/50 hover:bg-slate-50 text-center cursor-pointer transition-all group"
                >
                  <Upload className="w-8 h-8 text-slate-400 group-hover:text-[#6A1B2E] mx-auto mb-2 transition-colors" />
                  <p className="text-xs font-bold text-slate-800">
                    {selectedFile ? selectedFile.name : 'Click to browse & select local document file'}
                  </p>
                  <p className="text-[10px] font-semibold text-slate-400 mt-1">Supports PDF, DOCX, JPG, PNG (Max 10MB)</p>
                </div>

                <div className="flex items-center justify-end gap-3 pt-2">
                  <Button type="button" variant="outline" size="sm" onClick={() => setShowUploadModal(false)}>Cancel</Button>
                  <Button type="submit" size="sm" disabled={isSubmitting || !uploadName}>
                    {isSubmitting ? 'Uploading...' : 'Submit Document'}
                  </Button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Preview Modal */}
      <AnimatePresence>
        {previewDoc && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs" onClick={() => setPreviewDoc(null)} />
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="relative bg-white rounded-2xl p-6 w-full max-w-lg shadow-2xl border border-slate-100 z-10 text-left space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div>
                  <h3 className="text-sm font-black text-slate-900">{previewDoc.name}</h3>
                  <p className="text-xs font-semibold text-[#6A1B2E]">{previewDoc.type}</p>
                </div>
                <button onClick={() => setPreviewDoc(null)} className="p-1.5 rounded-full hover:bg-slate-100 text-slate-400"><X className="w-4 h-4" /></button>
              </div>

              <div className="p-8 bg-slate-50 border border-slate-200/70 rounded-2xl text-center space-y-3">
                <FileText className="w-16 h-16 text-[#6A1B2E] mx-auto opacity-90" />
                <p className="text-xs font-bold text-slate-700">Official Document Record Verified</p>
                <div className="inline-block px-3 py-1 bg-white rounded-lg border text-xs font-extrabold text-slate-800 shadow-2xs">
                  Status: {previewDoc.status}
                </div>
              </div>

              <div className="flex items-center justify-end">
                <Button size="sm" onClick={() => setPreviewDoc(null)}>Close Preview</Button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
