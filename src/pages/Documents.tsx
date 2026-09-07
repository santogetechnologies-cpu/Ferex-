import React, { useState, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Folder, Search, Upload, Eye, FileText, X, AlertCircle, ShieldCheck, Globe, CheckCircle2 } from 'lucide-react';
import { Card } from '../components/Card';
import { Button } from '../components/Button';
import { useAuth } from '../contexts/AuthContext';
import { useDocuments } from '../hooks/useDocuments';
import { useApplications } from '../hooks/useApplications';
import { useCountryWorkflows } from '../hooks/useCountryWorkflows';
import { ensureStudentApplication } from '../lib/api/applications';

export const Documents: React.FC = () => {
  const { user } = useAuth();
  const { applications } = useApplications(user?.id);
  const { getWorkflowForCountry } = useCountryWorkflows();

  const activeStudentId = (() => {
    if (user?.id) return user.id;
    try {
      const raw = localStorage.getItem('ferex_user');
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && parsed.id) return parsed.id;
      }
    } catch (e) {}
    return 'STUDENT_PENDING_AUTH';
  })();

  const { documents: dbDocs, loading, addDoc, replaceDoc } = useDocuments(activeStudentId);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Target country resolution
  const targetCountry = useMemo(() => {
    return applications[0]?.universities?.country || 'Poland';
  }, [applications]);

  const targetWf = useMemo(() => {
    return getWorkflowForCountry(targetCountry);
  }, [targetCountry, getWorkflowForCountry]);

  // Map DB docs or fall back to empty list if none
  const documents = dbDocs.map(d => ({
    id: d.id,
    name: d.file_name,
    type: d.doc_type,
    size: d.file_size || '1.2 MB',
    date: new Date(d.uploaded_at || Date.now()).toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' }),
    status: d.status,
    reviewerNotes: d.reviewer_notes || '',
    url: d.file_url || '',
  }));

  // Input states
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [previewDoc, setPreviewDoc] = useState<any | null>(null);
  const [resolvedPreviewUrl, setResolvedPreviewUrl] = useState<string>('');
  const [previewLoading, setPreviewLoading] = useState(false);
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

    // Normalize backward compatible statuses
    const normStatus = 
      (doc.status as string) === 'Pending Verification' || (doc.status as string) === 'Pending' ? 'Submitted' :
      (doc.status as string) === 'Re-upload Requested' ? 'Rejected' :
      (doc.status as string) === 'Verified' ? 'Approved' :
      doc.status;

    const matchesStatus =
      statusFilter === 'All' ||
      statusFilter === normStatus;

    return matchesSearch && matchesStatus;
  });

  const handleOpenPreview = async (doc: any) => {
    setPreviewDoc(doc);
    setResolvedPreviewUrl('');
    if (doc.url) {
      setPreviewLoading(true);
      try {
        if (doc.url.startsWith('blob:') || doc.url.startsWith('data:') || doc.url.startsWith('http')) {
          setResolvedPreviewUrl(doc.url);
        } else {
          const { getSignedFileUrl } = await import('../lib/storage');
          const signed = await getSignedFileUrl('student-documents', doc.url);
          setResolvedPreviewUrl(signed || doc.url);
        }
      } catch (err) {
        setResolvedPreviewUrl(doc.url);
      } finally {
        setPreviewLoading(false);
      }
    }
  };

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
    if (!user) return;
    if (!selectedFile && !reuploadTargetDocId) {
      showToast('Please click "Choose File" and select a document to upload.');
      return;
    }

    const nameToUse = uploadName.trim() || selectedFile?.name || 'Document.pdf';
    const baseName = nameToUse.includes('.') ? nameToUse : `${nameToUse}.pdf`;
    const fileSizeStr = selectedFile ? `${(selectedFile.size / (1024 * 1024)).toFixed(1)} MB` : '1.4 MB';

    // Upload directly to Supabase Storage bucket
    let fileUrlStr = '';
    if (selectedFile) {
      const { uploadFileToBucket } = await import('../lib/storage');
      const uploadRes = await uploadFileToBucket('student-documents', selectedFile, nameToUse.replace(/\.[^/.]+$/, ''));
      fileUrlStr = uploadRes.url;
    }

    if (!fileUrlStr && !reuploadTargetDocId) {
      showToast('Upload failed: could not upload file to storage.');
      return;
    }

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
        // Auto-enroll student into NAWA Review application so admin can track the process
        const studentName = (user as any)?.user_metadata?.full_name || user.email?.split('@')[0] || 'Student';
        await ensureStudentApplication(user.id, studentName);
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

      {/* Country Workflow Document Requirements Banner */}
      {targetWf && (
        <div className="bg-gradient-to-r from-[#24020B] to-[#58051E] rounded-2xl p-5 text-white shadow-md relative overflow-hidden border border-[#6A1B2E]/40">
          <div className="absolute top-0 right-0 w-64 h-64 bg-[#E6CA9E]/5 rounded-full blur-2xl pointer-events-none" />
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[#E6CA9E]/20 text-[#E6CA9E] text-[10px] font-extrabold uppercase tracking-wider border border-[#E6CA9E]/30">
                  <Globe className="w-3 h-3" />
                  {targetCountry} Legalization Requirements
                </span>
                <span className="inline-flex items-center gap-1 text-[11px] font-bold text-slate-300">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                  Authority: {targetWf.authority_acronym || targetWf.authority_name}
                </span>
              </div>
              <h2 className="text-base font-black text-white">{targetWf.authority_badge}</h2>
              <p className="text-xs text-slate-300 mt-1 max-w-2xl leading-relaxed">
                {targetWf.authority_description}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2 bg-white/10 p-3 rounded-xl backdrop-blur-xs border border-white/10 self-start md:self-auto shrink-0">
              <div className="text-right">
                <p className="text-[10px] uppercase font-bold text-slate-300">Processing Time</p>
                <p className="text-xs font-black text-[#E6CA9E]">{targetWf.estimated_processing_days}</p>
              </div>
              <div className="w-px h-6 bg-white/20 mx-1" />
              <div className="text-right">
                <p className="text-[10px] uppercase font-bold text-slate-300">Authority Fee</p>
                <p className="text-xs font-black text-white">{targetWf.authority_fee}</p>
              </div>
            </div>
          </div>

          {targetWf.checklist_documents && targetWf.checklist_documents.length > 0 && (
            <div className="mt-4 pt-4 border-t border-white/10">
              <p className="text-[11px] font-extrabold uppercase tracking-wider text-[#E6CA9E] mb-2.5 flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5" />
                Required Legalization & Visa Checklist ({targetWf.checklist_documents.length} Items)
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                {targetWf.checklist_documents.map((reqDoc) => {
                  const isUploaded = documents.some(d => 
                    d.name.toLowerCase().includes(reqDoc.name.toLowerCase().slice(0, 8)) ||
                    d.type.toLowerCase().includes(reqDoc.category.toLowerCase())
                  );
                  return (
                    <div 
                      key={reqDoc.id}
                      className={`p-2.5 rounded-xl border text-xs flex flex-col justify-between transition-all ${
                        isUploaded 
                          ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-100' 
                          : 'bg-white/5 border-white/10 text-slate-200 hover:bg-white/10'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2 mb-1">
                        <span className="font-bold text-[11px] leading-tight">{reqDoc.name}</span>
                        {reqDoc.is_mandatory && (
                          <span className="text-[9px] font-black uppercase px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30 shrink-0">
                            Required
                          </span>
                        )}
                      </div>
                      <p className="text-[10px] text-slate-300 leading-snug line-clamp-2">
                        {reqDoc.instructions}
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

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
          {['All', 'Submitted', 'Under Review', 'Approved', 'Rejected'].map(s => (
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
            // Map status directly
            const displayStatus = 
              (doc.status as string) === 'Pending Verification' || (doc.status as string) === 'Pending' ? 'Submitted' :
              (doc.status as string) === 'Re-upload Requested' ? 'Rejected' :
              (doc.status as string) === 'Verified' ? 'Approved' :
              (doc.status as string) === 'Under Review' ? 'Under Review' :
              doc.status || 'Submitted';

            const badgeClass = 
              displayStatus === 'Approved' ? 'bg-emerald-50 text-emerald-700 border-emerald-200 font-bold' :
              displayStatus === 'Rejected' ? 'bg-red-50 text-red-700 border-red-200 font-bold' :
              displayStatus === 'Under Review' ? 'bg-amber-50 text-amber-700 border-amber-200 font-extrabold animate-pulse' :
              displayStatus === 'Submitted' ? 'bg-blue-50 text-blue-700 border-blue-200 font-bold' :
              'bg-slate-50 text-slate-700 border-slate-200';

            const isReupload = displayStatus === 'Rejected';

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

                  {(doc.reviewerNotes || (doc as any).rejection_reason || (doc as any).notes || (doc as any).comment) && (
                    <div className="mt-3 p-3 bg-red-50/90 border border-red-200/90 rounded-xl text-left shadow-2xs">
                      <p className="text-[10px] font-black uppercase tracking-wider text-red-800 flex items-center gap-1.5 mb-1">
                        <AlertCircle className="w-3.5 h-3.5 text-red-600 shrink-0" />
                        Rejection Reason / Admin Feedback
                      </p>
                      <p className="text-xs font-bold text-red-950 leading-relaxed">
                        {doc.reviewerNotes || (doc as any).rejection_reason || (doc as any).notes || (doc as any).comment}
                      </p>
                    </div>
                  )}
                </div>

                <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2 mt-4">
                  <button
                    onClick={() => handleOpenPreview(doc)}
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
                      className="h-8 px-3.5 bg-red-600 hover:bg-red-700 text-white text-xs font-extrabold rounded-xl flex items-center gap-1.5 transition-all shadow-xs"
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
                <h3 className="text-base font-black text-slate-900">
                  {reuploadTargetDocId ? 'Re-upload Document' : 'Upload Compliance Document'}
                </h3>
                <button onClick={() => setShowUploadModal(false)} className="p-1.5 rounded-full hover:bg-slate-100 text-slate-400"><X className="w-4 h-4" /></button>
              </div>

              {/* Display Rejection Reason Banner in Modal if re-uploading */}
              {(() => {
                const reuploadTargetDoc = documents.find(d => d.id === reuploadTargetDocId);
                const targetNotes = reuploadTargetDoc?.reviewerNotes || (reuploadTargetDoc as any)?.rejection_reason || (reuploadTargetDoc as any)?.notes || (reuploadTargetDoc as any)?.comment;
                if (!targetNotes) return null;
                return (
                  <div className="p-3.5 bg-red-50 border border-red-200 rounded-xl text-left space-y-1">
                    <span className="text-[10px] font-black uppercase tracking-wider text-red-800 flex items-center gap-1.5">
                      <AlertCircle className="w-4 h-4 text-red-600 shrink-0" /> Admin Rejection Reason
                    </span>
                    <p className="text-xs font-bold text-red-950 leading-relaxed">
                      "{targetNotes}"
                    </p>
                    <p className="text-[11px] font-semibold text-red-700 pt-0.5">
                      Please review the admin feedback above and upload an updated file to replace this document.
                    </p>
                  </div>
                );
              })()}

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

      {/* Interactive Document Preview Modal */}
      <AnimatePresence>
        {previewDoc && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs" onClick={() => setPreviewDoc(null)} />
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="relative bg-white rounded-2xl p-5 sm:p-6 w-full max-w-3xl shadow-2xl border border-slate-100 z-10 text-left space-y-4 max-h-[90vh] flex flex-col">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="min-w-0 flex-1 pr-3">
                  <h3 className="text-base font-black text-slate-900 truncate">{previewDoc.name}</h3>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-xs font-semibold text-[#6A1B2E]">{previewDoc.type}</span>
                    <span className="text-slate-300">•</span>
                    <span className="text-xs font-medium text-slate-500">{previewDoc.size}</span>
                    <span className="text-slate-300">•</span>
                    <span className="text-xs font-bold text-slate-700">{previewDoc.status}</span>
                  </div>
                </div>
                <button onClick={() => setPreviewDoc(null)} className="p-1.5 rounded-full hover:bg-slate-100 text-slate-400 shrink-0"><X className="w-5 h-5" /></button>
              </div>

              {/* Document Preview Content Frame */}
              <div className="flex-1 min-h-[320px] max-h-[550px] overflow-hidden rounded-xl border border-slate-200 bg-slate-50 relative flex flex-col items-center justify-center">
                {previewLoading ? (
                  <div className="py-12 text-center text-xs font-bold text-slate-400">Loading document preview...</div>
                ) : resolvedPreviewUrl ? (
                  resolvedPreviewUrl.match(/\.(jpg|jpeg|png|webp|gif)($|\?)/i) || resolvedPreviewUrl.startsWith('data:image') ? (
                    <div className="w-full h-full overflow-auto flex items-center justify-center p-2 bg-slate-900/5">
                      <img src={resolvedPreviewUrl} alt={previewDoc.name} className="max-w-full max-h-[500px] object-contain rounded-lg shadow-sm" />
                    </div>
                  ) : (
                    <iframe
                      src={resolvedPreviewUrl}
                      title={previewDoc.name}
                      className="w-full h-full min-h-[420px] border-0 rounded-xl bg-white"
                    />
                  )
                ) : (
                  <div className="p-8 text-center space-y-3">
                    <FileText className="w-16 h-16 text-[#6A1B2E]/60 mx-auto" />
                    <p className="text-sm font-bold text-slate-800">Compliance Document File Registered</p>
                    <p className="text-xs text-slate-500 max-w-sm mx-auto">
                      This document is securely verified and logged under your FEREX compliance record.
                    </p>
                    <div className="inline-block px-3 py-1 bg-white rounded-lg border text-xs font-extrabold text-slate-800 shadow-2xs">
                      Status: {previewDoc.status}
                    </div>
                  </div>
                )}
              </div>

              {/* Footer Actions */}
              <div className="flex items-center justify-between pt-2 border-t border-slate-100 flex-wrap gap-2">
                <div className="text-xs text-slate-500 font-semibold">
                  Uploaded on: <span className="font-bold text-slate-800">{previewDoc.date}</span>
                </div>
                <div className="flex items-center gap-2">
                  {resolvedPreviewUrl && (
                    <a
                      href={resolvedPreviewUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="px-4 py-2 bg-[#6A1B2E] text-white text-xs font-extrabold rounded-xl hover:bg-[#521221] transition-all inline-flex items-center gap-1.5 shadow-xs"
                    >
                      <Eye className="w-3.5 h-3.5" /> Open in Full Tab / Download
                    </a>
                  )}
                  <Button size="sm" variant="outline" onClick={() => setPreviewDoc(null)}>Close</Button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
