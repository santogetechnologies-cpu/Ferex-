import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Folder, Search, Upload, Eye, FileText, X, AlertCircle,
  ShieldCheck, Globe, CheckCircle2, Download, ExternalLink
} from 'lucide-react';
import { Card } from '../components/Card';
import { Button } from '../components/Button';
import { Badge } from '../components/Badge';
import { useAuth } from '../contexts/AuthContext';
import { useDocuments } from '../hooks/useDocuments';
import { useApplications } from '../hooks/useApplications';
import { useCountryWorkflows } from '../hooks/useCountryWorkflows';
import { ensureStudentApplication } from '../lib/api/applications';
import { getDocumentRequirements, calculateDossierStatus, type DocumentRequirement } from '../lib/api/documentRequirements';

export const Documents: React.FC = () => {
  const { user, profile } = useAuth();
  const { applications } = useApplications(user?.id);
  const { getWorkflowForCountry } = useCountryWorkflows();

  // Check if user is admin/staff to show all documents
  const userRole = profile?.role || 'student';
  const isAdminOrStaff = ['admin', 'super_admin', 'staff', 'counselor'].includes(userRole.toLowerCase());

  const activeStudentId = (() => {
    // If admin/staff, don't filter by student - show all documents
    if (isAdminOrStaff) return undefined;
    
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
  const [configuredReqs, setConfiguredReqs] = useState<DocumentRequirement[]>([]);

  // Target country resolution - dynamically bound to selected destination university & country
  const targetCountry = useMemo(() => {
    const isInvalid = (c?: string | null) => !c || c.toLowerCase().trim() === 'not set' || c.trim() === '';

    try {
      const storedCourse = localStorage.getItem('ferex_selected_course');
      if (storedCourse) {
        const parsed = JSON.parse(storedCourse);
        if (parsed?.country && !isInvalid(parsed.country)) return parsed.country.trim();
        if (parsed?.university?.country && !isInvalid(parsed.university.country)) return parsed.university.country.trim();
      }
      const storedUni = localStorage.getItem('ferex_student_selected_uni');
      if (storedUni) {
        const parsed = JSON.parse(storedUni);
        if (parsed?.country && !isInvalid(parsed.country)) return parsed.country.trim();
      }
    } catch (e) {}

    const appCountry = applications[0]?.universities?.country || (applications[0] as any)?.country;
    if (appCountry && !isInvalid(appCountry)) return appCountry.trim();

    const profileTarget = (profile as any)?.target_country;
    if (profileTarget && !isInvalid(profileTarget)) return profileTarget.trim();

    const localTarget = localStorage.getItem('ferex_student_target_country');
    if (localTarget && !isInvalid(localTarget)) return localTarget.trim();

    return null;
  }, [profile, applications]);

  const loadRequirements = React.useCallback(() => {
    if (targetCountry) {
      getDocumentRequirements(targetCountry).then(setConfiguredReqs);
    } else {
      setConfiguredReqs([]);
    }
  }, [targetCountry]);

  useEffect(() => {
    loadRequirements();
    window.addEventListener('ferex_doc_requirements_change', loadRequirements);
    window.addEventListener('ferex_country_change', loadRequirements);
    window.addEventListener('storage', loadRequirements);
    return () => {
      window.removeEventListener('ferex_doc_requirements_change', loadRequirements);
      window.removeEventListener('ferex_country_change', loadRequirements);
      window.removeEventListener('storage', loadRequirements);
    };
  }, [loadRequirements]);

  const targetWf = useMemo(() => {
    return targetCountry ? getWorkflowForCountry(targetCountry) : null;
  }, [targetCountry, getWorkflowForCountry]);

  // Map DB docs or fall back to empty list if none
  const documents = dbDocs.map(d => {
    // Extract student name from joined users data or fall back to profile
    const studentName = d.users?.full_name || 
                        d.users?.email?.split('@')[0] || 
                        profile?.full_name || 
                        user?.email?.split('@')[0] || 
                        'Unknown Student';
    
    return {
      id: d.id,
      name: d.file_name,
      type: d.doc_type,
      size: d.file_size || '1.2 MB',
      date: new Date(d.uploaded_at || Date.now()).toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' }),
      uploadedAt: d.uploaded_at || Date.now(),
      status: d.status,
      reviewerNotes: d.reviewer_notes || '',
      url: d.file_url || '',
      studentName,
      studentId: d.student_id,
    };
  });

  // Group documents by student name (for folder view)
  const documentsByStudent = useMemo(() => {
    const grouped = new Map<string, typeof documents>();
    documents.forEach(doc => {
      const name = doc.studentName;
      if (!grouped.has(name)) {
        grouped.set(name, []);
      }
      grouped.get(name)!.push(doc);
    });
    return grouped;
  }, [documents]);

  // Date filtering helper
  const filterByDate = (doc: typeof documents[0]) => {
    if (dateFilter === 'All') return true;
    const docDate = new Date(doc.uploadedAt);
    const now = new Date();
    
    if (dateFilter === 'Today') {
      return docDate.toDateString() === now.toDateString();
    } else if (dateFilter === 'Last 7 Days') {
      const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      return docDate >= sevenDaysAgo;
    } else if (dateFilter === 'Last 30 Days') {
      const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      return docDate >= thirtyDaysAgo;
    } else if (dateFilter === 'This Year') {
      return docDate.getFullYear() === now.getFullYear();
    }
    return true;
  };

  // Input states
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [dateFilter, setDateFilter] = useState('All');
  const [selectedFolder, setSelectedFolder] = useState<string>('all'); // 'all' or student name
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

  // Dynamic Dossier Completeness calculation
  const dossierStatus = useMemo(() => {
    return calculateDossierStatus(configuredReqs, documents);
  }, [configuredReqs, documents]);

  const handleOpenUploadForReq = (req: DocumentRequirement) => {
    setReuploadTargetDocId(null);
    setUploadName(req.document_name);
    setUploadType(req.document_type || 'Transcripts');
    setSelectedFile(null);
    setShowUploadModal(true);
  };

  // Search & Filter
  const filteredDocs = documents.filter((doc) => {
    const matchesSearch =
      doc.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      doc.type.toLowerCase().includes(searchQuery.toLowerCase()) ||
      doc.status.toLowerCase().includes(searchQuery.toLowerCase());

    const normStatus = 
      (doc.status as string) === 'Pending Verification' || (doc.status as string) === 'Pending' ? 'Submitted' :
      (doc.status as string) === 'Re-upload Requested' ? 'Rejected' :
      (doc.status as string) === 'Verified' ? 'Approved' :
      doc.status;

    const matchesStatus =
      statusFilter === 'All' ||
      statusFilter === normStatus;

    const matchesDate = filterByDate(doc);

    const matchesFolder = 
      selectedFolder === 'all' ||
      doc.studentName === selectedFolder;

    return matchesSearch && matchesStatus && matchesDate && matchesFolder;
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
        showToast(`Document "${baseName}" re-uploaded successfully and submitted for review.`);
      } else {
        await addDoc({
          student_id: user.id,
          file_name: baseName,
          file_url: fileUrlStr,
          file_size: fileSizeStr,
          doc_type: uploadType,
        });
        const studentName = (user as any)?.user_metadata?.full_name || user.email?.split('@')[0] || 'Student';
        await ensureStudentApplication(user.id, studentName);
        showToast(`Document "${baseName}" submitted successfully for verification.`);
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

  const getStatusBadge = (status: string) => {
    const norm =
      status === 'Pending Verification' || status === 'Pending' ? 'Submitted' :
      status === 'Re-upload Requested' ? 'Rejected' :
      status === 'Verified' ? 'Approved' :
      status;

    if (norm === 'Approved') return <Badge variant="success" dot>Approved</Badge>;
    if (norm === 'Rejected') return <Badge variant="error" dot>Action Required</Badge>;
    if (norm === 'Under Review') return <Badge variant="brand" dot>Under Review</Badge>;
    return <Badge variant="neutral" dot>Submitted</Badge>;
  };

  return (
    <div className="space-y-6 text-left relative min-h-[600px] pb-10">
      {/* Toast Notification */}
      <AnimatePresence>
        {toastMessage && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed top-6 right-6 z-50 bg-slate-900 text-white px-4 py-3 rounded-lg shadow-card text-xs font-semibold flex items-center gap-2 border border-slate-700"
          >
            <Folder className="w-4 h-4 text-[#58051E]" />
            {toastMessage}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header Section */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5 mb-1">
            <div className="w-8 h-8 rounded-lg bg-[#58051E]/8 text-[#58051E] flex items-center justify-center">
              <Folder className="w-4 h-4" />
            </div>
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">
              Document Vault
            </h1>
          </div>
          <p className="text-xs text-slate-500">
            Upload, verify, and track your required academic, identity, and consular documents.
          </p>
        </div>

        <Button
          onClick={() => {
            setUploadName('');
            setSelectedFile(null);
            setReuploadTargetDocId(null);
            setShowUploadModal(true);
          }}
          size="sm"
          leftIcon={<Upload className="w-4 h-4" />}
          className="self-start sm:self-auto"
        >
          Upload Document
        </Button>
      </div>

      {/* Legalization & Country Checklist Card */}
      {targetWf ? (
        <div className="bg-slate-900 rounded-xl p-5 text-white border border-slate-800 shadow-card relative overflow-hidden">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
            <div>
              <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-white/10 text-slate-200 text-[11px] font-semibold tracking-wide border border-white/10">
                  <Globe className="w-3 h-3 text-slate-400" />
                  {targetCountry} Compliance Protocol
                </span>
                <span className="inline-flex items-center gap-1 text-xs text-slate-300">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                  Authority: {targetWf.authority_acronym || targetWf.authority_name}
                </span>
              </div>
              <h2 className="text-sm font-semibold text-white">{targetWf.authority_badge}</h2>
              <p className="text-xs text-slate-300 mt-1 max-w-2xl leading-relaxed">
                {targetWf.authority_description}
              </p>
            </div>
            <div className="flex items-center gap-3 bg-white/5 p-3 rounded-lg border border-white/10 self-start md:self-auto shrink-0">
              <div className="text-left md:text-right">
                <p className="text-[10px] uppercase font-semibold text-slate-400">Processing Time</p>
                <p className="text-xs font-bold text-white">{targetWf.estimated_processing_days}</p>
              </div>
              <div className="w-px h-6 bg-white/10" />
              <div className="text-left md:text-right">
                <p className="text-[10px] uppercase font-semibold text-slate-400">Authority Fee</p>
                <p className="text-xs font-bold text-white">{targetWf.authority_fee}</p>
              </div>
            </div>
          </div>

          {/* Dossier Completeness Alert Pill */}
          {configuredReqs.length > 0 && (
            <div className={`mt-4 p-3 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs ${
              dossierStatus.isComplete
                ? 'bg-emerald-950/40 border-emerald-500/30 text-emerald-200'
                : 'bg-amber-950/40 border-amber-500/30 text-amber-200'
            }`}>
              <div className="flex items-center gap-2.5">
                {dossierStatus.isComplete ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                ) : (
                  <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" />
                )}
                <div>
                  <span className="font-extrabold uppercase tracking-wide text-[10px] block">
                    {dossierStatus.isComplete ? 'Dossier Status: Complete' : 'Dossier Status: Incomplete'}
                  </span>
                  <span className="text-[11px] text-slate-300">
                    {dossierStatus.isComplete
                      ? `All ${dossierStatus.mandatoryCount} mandatory compliance files have been uploaded for ${targetCountry} audit.`
                      : `${dossierStatus.uploadedMandatoryCount} of ${dossierStatus.mandatoryCount} mandatory documents uploaded. All mandatory files are required.`}
                  </span>
                </div>
              </div>
              <span className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider shrink-0 self-start sm:self-auto border ${
                dossierStatus.isComplete
                  ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                  : 'bg-amber-500/20 text-amber-300 border-amber-500/30'
              }`}>
                {dossierStatus.isComplete ? 'Ready for Review' : `${dossierStatus.missingMandatoryCount} Missing Mandatory`}
              </span>
            </div>
          )}

          {/* Configured Document Requirements Checklist */}
          {configuredReqs.length > 0 ? (
            <div className="mt-4 pt-4 border-t border-white/10">
              <div className="flex items-center justify-between mb-2.5">
                <p className="text-[11px] font-semibold text-slate-300 flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                  Required Dossier Checklist ({dossierStatus.results.length} Items)
                </p>
                <span className="text-[10px] font-bold text-slate-400">
                  {dossierStatus.uploadedCount} / {dossierStatus.totalCount} Uploaded
                </span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                {dossierStatus.results.map((item) => {
                  const reqDoc = item.requirement;
                  const isUploaded = item.isSatisfied;
                  const statusLabel = 
                    item.status === 'Approved' ? 'Approved' :
                    item.status === 'Under Review' ? 'In Review' :
                    item.status === 'Submitted' ? 'Submitted' :
                    item.status === 'Rejected' ? 'Rejected' : 'Missing';

                  const badgeColor =
                    item.status === 'Approved' ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30' :
                    item.status === 'Under Review' ? 'bg-blue-500/20 text-blue-300 border-blue-500/30' :
                    item.status === 'Submitted' ? 'bg-teal-500/20 text-teal-300 border-teal-500/30' :
                    item.status === 'Rejected' ? 'bg-rose-500/20 text-rose-300 border-rose-500/30' :
                    'bg-amber-500/20 text-amber-300 border-amber-500/30';

                  return (
                    <div 
                      key={reqDoc.id}
                      className={`p-3 rounded-xl border text-xs flex flex-col justify-between transition-all ${
                        isUploaded 
                          ? 'bg-emerald-950/20 border-emerald-500/30 text-emerald-200' 
                          : 'bg-white/5 border-white/10 text-slate-200 hover:bg-white/10'
                      }`}
                    >
                      <div>
                        <div className="flex items-start justify-between gap-2 mb-1.5">
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-1.5 mb-1 flex-wrap">
                              <span className="text-[9.5px] px-1.5 py-0.2 rounded bg-white/10 text-slate-300 font-bold uppercase">
                                {reqDoc.document_type || 'General'}
                              </span>
                              {reqDoc.is_required ? (
                                <span className="text-[9.5px] font-extrabold px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30 shrink-0">
                                  MANDATORY
                                </span>
                              ) : (
                                <span className="text-[9.5px] font-medium px-1.5 py-0.2 rounded bg-slate-500/20 text-slate-400 border border-slate-500/30 shrink-0">
                                  OPTIONAL
                                </span>
                              )}
                            </div>
                            <span className="font-bold text-xs leading-tight text-white block">
                              {reqDoc.document_name}
                            </span>
                          </div>
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border shrink-0 ${badgeColor}`}>
                            {statusLabel}
                          </span>
                        </div>

                        {reqDoc.description && (
                          <p className="text-[10px] text-slate-400 leading-snug line-clamp-2 mt-1">
                            {reqDoc.description}
                          </p>
                        )}

                        {reqDoc.checklist_items && reqDoc.checklist_items.length > 0 && (
                          <div className="mt-2 text-[9.5px] text-slate-400 space-y-0.5">
                            {reqDoc.checklist_items.map((criterion, cIdx) => (
                              <div key={cIdx} className="flex items-center gap-1 truncate">
                                <span className="text-amber-400">•</span>
                                <span className="truncate">{criterion}</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      <div className="pt-2.5 mt-2 border-t border-white/10 flex items-center justify-between gap-2">
                        <div className="text-[9.5px] text-slate-400">
                          <span>{reqDoc.processing_time || '3-7 Days'}</span> • <span>{reqDoc.authority_fee || 'Free'}</span>
                        </div>

                        {!isUploaded ? (
                          <button
                            type="button"
                            onClick={() => handleOpenUploadForReq(reqDoc)}
                            className="px-2.5 py-1 bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-lg text-[10px] font-extrabold flex items-center gap-1 transition-colors cursor-pointer shadow-xs"
                          >
                            <Upload className="w-3 h-3" /> Upload
                          </button>
                        ) : (
                          item.doc && (
                            <button
                              type="button"
                              onClick={() => handleOpenPreview(item.doc)}
                              className="text-[10px] font-bold text-emerald-400 hover:underline flex items-center gap-1 cursor-pointer"
                            >
                              <Eye className="w-3 h-3" /> Preview
                            </button>
                          )
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            targetWf.checklist_documents && targetWf.checklist_documents.length > 0 && (
              <div className="mt-4 pt-4 border-t border-white/10">
                <p className="text-[11px] font-semibold text-slate-300 mb-2.5 flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                  Required Dossier Checklist ({targetWf.checklist_documents.length} Items)
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
                        className={`p-2.5 rounded-lg border text-xs flex flex-col justify-between transition-all ${
                          isUploaded 
                            ? 'bg-emerald-950/30 border-emerald-500/30 text-emerald-200' 
                            : 'bg-white/5 border-white/10 text-slate-200 hover:bg-white/10'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2 mb-1">
                          <span className="font-semibold text-[11px] leading-tight">{reqDoc.name}</span>
                          {reqDoc.is_mandatory && (
                            <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30 shrink-0">
                              Required
                            </span>
                          )}
                        </div>
                        <p className="text-[10px] text-slate-400 leading-snug line-clamp-2">
                          {reqDoc.instructions}
                        </p>
                      </div>
                    );
                  })}
                </div>
              </div>
            )
          )}
        </div>
      ) : (
        <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-[#58051E]/90 rounded-xl p-5 text-white border border-slate-700/60 shadow-card flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 text-[11px] font-semibold border border-amber-500/30">
                <Globe className="w-3 h-3" />
                Select Destination University
              </span>
            </div>
            <h2 className="text-sm font-semibold text-white">Destination Compliance & Legalization Protocol</h2>
            <p className="text-xs text-slate-300 max-w-xl leading-relaxed">
              Your required document checklist, apostille/legalization dossier, and embassy protocols will dynamically calibrate once you choose your destination institution.
            </p>
          </div>
          <Link to="/student/select-university">
            <Button size="sm" className="bg-[#E5A73B] hover:bg-[#d4962b] text-slate-950 font-semibold shrink-0">
              Browse Universities
            </Button>
          </Link>
        </div>
      )}

      {/* Filter Bar with Date and Folder Filters */}
      <div className="flex flex-col lg:flex-row gap-3">
        {/* Folder Sidebar */}
        <Card className="lg:w-64 p-4 space-y-3 shrink-0">
          <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
            <Folder className="w-4 h-4 text-[#58051E]" />
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">Folders</h3>
          </div>
          
          <button
            onClick={() => setSelectedFolder('all')}
            className={`w-full text-left px-3 py-2 rounded-lg text-xs font-semibold transition-all ${
              selectedFolder === 'all'
                ? 'bg-[#58051E] text-white'
                : 'bg-slate-50 text-slate-700 hover:bg-slate-100'
            }`}
          >
            <div className="flex items-center justify-between">
              <span>All Documents</span>
              <span className="text-[10px] opacity-80">{documents.length}</span>
            </div>
          </button>

          {Array.from(documentsByStudent.entries()).map(([studentName, docs]) => (
            <button
              key={studentName}
              onClick={() => setSelectedFolder(studentName)}
              className={`w-full text-left px-3 py-2 rounded-lg text-xs font-semibold transition-all ${
                selectedFolder === studentName
                  ? 'bg-[#58051E] text-white'
                  : 'bg-slate-50 text-slate-700 hover:bg-slate-100'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 min-w-0">
                  <div className="w-6 h-6 rounded-md bg-amber-100 text-amber-700 flex items-center justify-center text-[10px] font-bold shrink-0">
                    {studentName.charAt(0).toUpperCase()}
                  </div>
                  <span className="truncate">{studentName}</span>
                </div>
                <span className="text-[10px] opacity-80">{docs.length}</span>
              </div>
            </button>
          ))}
        </Card>

        {/* Main Content */}
        <div className="flex-1 space-y-4">
          {/* Document Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Card className="p-3">
              <p className="text-[10px] font-semibold uppercase text-slate-500 mb-1">Total</p>
              <p className="text-xl font-black text-slate-900">{documents.length}</p>
            </Card>
            <Card className="p-3">
              <p className="text-[10px] font-semibold uppercase text-slate-500 mb-1">Approved</p>
              <p className="text-xl font-black text-emerald-600">
                {documents.filter(d => d.status === 'Approved').length}
              </p>
            </Card>
            <Card className="p-3">
              <p className="text-[10px] font-semibold uppercase text-slate-500 mb-1">Pending</p>
              <p className="text-xl font-black text-amber-600">
                {documents.filter(d => d.status === 'Pending Verification' || d.status === 'Submitted').length}
              </p>
            </Card>
            <Card className="p-3">
              <p className="text-[10px] font-semibold uppercase text-slate-500 mb-1">Rejected</p>
              <p className="text-xl font-black text-red-600">
                {documents.filter(d => d.status === 'Rejected' || d.status === 'Re-upload Requested').length}
              </p>
            </Card>
          </div>

      {/* Search & Filter Toolbar */}
      <div className="bg-white p-2.5 rounded-xl border border-slate-200/80 shadow-subtle flex flex-col sm:flex-row items-center gap-2.5">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search documents by name, category, or status..."
            className="w-full h-9 pl-9 pr-4 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-[#58051E] focus:bg-white"
          />
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto">
          {['All', 'Submitted', 'Approved', 'Rejected'].map(s => {
            const isSelected = statusFilter === s;
            return (
              <button
                key={s}
                type="button"
                onClick={() => setStatusFilter(s)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors cursor-pointer ${
                  isSelected
                    ? 'bg-[#58051E] text-white shadow-xs'
                    : 'bg-slate-50 text-slate-600 hover:bg-slate-100 border border-slate-200/70'
                }`}
              >
                {s}
              </button>
            );
          })}
        </div>

        {/* Date Filter */}
        <select
          value={dateFilter}
          onChange={(e) => setDateFilter(e.target.value)}
          className="h-9 px-3 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#58051E]/20 focus:border-[#58051E]/40 cursor-pointer"
        >
          <option value="All">All Time</option>
          <option value="Today">Today</option>
          <option value="Last 7 Days">Last 7 Days</option>
          <option value="Last 30 Days">Last 30 Days</option>
          <option value="This Year">This Year</option>
        </select>
      </div>

      {/* Documents Grid */}
      {loading && dbDocs.length === 0 ? (
        <div className="py-16 text-center text-xs font-semibold text-slate-400">Loading document vault...</div>
      ) : filteredDocs.length === 0 ? (
        <div className="bg-white border border-slate-200/80 rounded-xl p-12 text-center shadow-subtle">
          <FileText className="w-10 h-10 text-slate-300 mx-auto mb-3" />
          <h3 className="text-sm font-semibold text-slate-800">No Documents Found</h3>
          <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto mb-5">
            {searchQuery || statusFilter !== 'All'
              ? 'No documents match your current search query or status filter.'
              : 'Upload academic transcripts, passport copies, and required compliance files to initiate your admissions review.'}
          </p>
          <Button
            size="sm"
            onClick={() => setShowUploadModal(true)}
            leftIcon={<Upload className="w-4 h-4" />}
          >
            Upload First Document
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredDocs.map((doc) => {
            const displayStatus = 
              (doc.status as string) === 'Pending Verification' || (doc.status as string) === 'Pending' ? 'Submitted' :
              (doc.status as string) === 'Re-upload Requested' ? 'Rejected' :
              (doc.status as string) === 'Verified' ? 'Approved' :
              (doc.status as string) === 'Under Review' ? 'Under Review' :
              doc.status || 'Submitted';

            const isReupload = displayStatus === 'Rejected';

            return (
              <Card key={doc.id} className="p-4 border border-slate-200/80 hover:border-slate-300 transition-all flex flex-col justify-between bg-white">
                <div>
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <div className="w-9 h-9 rounded-lg bg-slate-50 border border-slate-200/70 flex items-center justify-center shrink-0 text-[#58051E]">
                      <FileText className="w-4 h-4" />
                    </div>
                    {getStatusBadge(doc.status)}
                  </div>

                  <h3 className="text-sm font-semibold text-slate-900 leading-snug mb-1 truncate" title={doc.name}>
                    {doc.name}
                  </h3>
                  <p className="text-xs font-medium text-slate-500 mb-3">{doc.type}</p>

                  <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-100 text-xs text-slate-500 space-y-1">
                    <div className="flex justify-between"><span>File Size:</span><span className="font-semibold text-slate-800">{doc.size}</span></div>
                    <div className="flex justify-between"><span>Uploaded:</span><span className="font-semibold text-slate-800">{doc.date}</span></div>
                  </div>

                  {(doc.reviewerNotes || (doc as any).rejection_reason || (doc as any).notes || (doc as any).comment) && (
                    <div className="mt-3 p-3 bg-red-50/70 border border-red-200/70 rounded-lg text-left">
                      <p className="text-[10px] font-semibold uppercase tracking-wider text-red-800 flex items-center gap-1.5 mb-1">
                        <AlertCircle className="w-3.5 h-3.5 text-red-600 shrink-0" />
                        Admin Feedback
                      </p>
                      <p className="text-xs text-red-950 leading-relaxed">
                        {doc.reviewerNotes || (doc as any).rejection_reason || (doc as any).notes || (doc as any).comment}
                      </p>
                    </div>
                  )}
                </div>

                <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2 mt-4">
                  <button
                    type="button"
                    onClick={() => handleOpenPreview(doc)}
                    className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#58051E] hover:underline cursor-pointer"
                  >
                    <Eye className="w-3.5 h-3.5" /> Preview
                  </button>

                  {isReupload && (
                    <Button
                      size="xs"
                      variant="destructive"
                      onClick={() => {
                        setReuploadTargetDocId(doc.id);
                        setUploadName(doc.name);
                        setUploadType(doc.type);
                        setShowUploadModal(true);
                      }}
                      leftIcon={<Upload className="w-3.5 h-3.5" />}
                    >
                      Re-upload
                    </Button>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      )}
        </div>
      </div>

      {/* Upload File Modal */}
      <AnimatePresence>
        {showUploadModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs"
              onClick={() => setShowUploadModal(false)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.96 }}
              className="relative bg-white rounded-xl p-6 w-full max-w-md shadow-card border border-slate-200 z-10 text-left space-y-4"
            >
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <h3 className="text-base font-semibold text-slate-900">
                  {reuploadTargetDocId ? 'Re-upload Document' : 'Upload Compliance Document'}
                </h3>
                <button
                  type="button"
                  onClick={() => setShowUploadModal(false)}
                  className="p-1 rounded-lg hover:bg-slate-100 text-slate-400 cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Rejection notice in modal */}
              {(() => {
                const reuploadTargetDoc = documents.find(d => d.id === reuploadTargetDocId);
                const targetNotes = reuploadTargetDoc?.reviewerNotes || (reuploadTargetDoc as any)?.rejection_reason || (reuploadTargetDoc as any)?.notes || (reuploadTargetDoc as any)?.comment;
                if (!targetNotes) return null;
                return (
                  <div className="p-3 bg-red-50/80 border border-red-200 rounded-lg text-left space-y-1">
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-red-800 flex items-center gap-1.5">
                      <AlertCircle className="w-3.5 h-3.5 text-red-600 shrink-0" /> Previous Feedback
                    </span>
                    <p className="text-xs text-red-950 leading-relaxed">
                      "{targetNotes}"
                    </p>
                  </div>
                );
              })()}

              <form onSubmit={handleUploadSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">Document File Name</label>
                  <input
                    type="text"
                    value={uploadName}
                    onChange={(e) => setUploadName(e.target.value)}
                    placeholder="e.g. Bachelor_Degree_Transcript"
                    required
                    className="w-full h-10 px-3 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-900 focus:outline-none focus:border-[#58051E] focus:bg-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">Document Category</label>
                  <select
                    value={uploadType}
                    onChange={(e) => setUploadType(e.target.value)}
                    className="w-full h-10 px-3 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-900 focus:outline-none focus:border-[#58051E] focus:bg-white"
                  >
                    <option value="Academic">Academic Marksheets & Diplomas</option>
                    <option value="Transcripts">Transcripts & Scorecards</option>
                    <option value="Identification">Identification (Passport / ID)</option>
                    <option value="Financial">Financial Statement & Living Funds</option>
                    <option value="Language">Language Proficiency (MOI / IELTS)</option>
                    <option value="Insurance">Medical & Travel Insurance</option>
                    <option value="Attestation">Apostille / Embassy Legalization</option>
                    <option value="Recommendation">Letter of Recommendation (LOR)</option>
                    <option value="Other">Other Certificate / SOP</option>
                  </select>
                </div>

                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                  className="hidden"
                />

                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="p-6 border border-dashed border-slate-200 hover:border-[#58051E]/50 rounded-xl bg-slate-50/50 hover:bg-slate-50 text-center cursor-pointer transition-all"
                >
                  <Upload className="w-6 h-6 text-slate-400 mx-auto mb-2" />
                  <p className="text-xs font-semibold text-slate-800 truncate">
                    {selectedFile ? selectedFile.name : 'Click to select local document file'}
                  </p>
                  <p className="text-[11px] text-slate-400 mt-0.5">Supports PDF, DOCX, JPG, PNG (Max 10MB)</p>
                </div>

                <div className="flex items-center justify-end gap-2 pt-2">
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

      {/* Document Preview Modal */}
      <AnimatePresence>
        {previewDoc && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs"
              onClick={() => setPreviewDoc(null)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.96 }}
              className="relative bg-white rounded-xl p-5 sm:p-6 w-full max-w-3xl shadow-card border border-slate-200 z-10 text-left space-y-4 max-h-[90vh] flex flex-col"
            >
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="min-w-0 flex-1 pr-3">
                  <h3 className="text-base font-semibold text-slate-900 truncate">{previewDoc.name}</h3>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-xs font-medium text-[#58051E]">{previewDoc.type}</span>
                    <span className="text-slate-300">•</span>
                    <span className="text-xs text-slate-500">{previewDoc.size}</span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setPreviewDoc(null)}
                  className="p-1 rounded-lg hover:bg-slate-100 text-slate-400 shrink-0 cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Document Preview Content Frame */}
              <div className="flex-1 min-h-[320px] max-h-[550px] overflow-hidden rounded-lg border border-slate-200 bg-slate-50 relative flex flex-col items-center justify-center">
                {previewLoading ? (
                  <div className="py-12 text-center text-xs font-semibold text-slate-400">Loading document preview...</div>
                ) : resolvedPreviewUrl ? (
                  resolvedPreviewUrl.match(/\.(jpg|jpeg|png|webp|gif)($|\?)/i) || resolvedPreviewUrl.startsWith('data:image') ? (
                    <div className="w-full h-full overflow-auto flex items-center justify-center p-2 bg-slate-900/5">
                      <img src={resolvedPreviewUrl} alt={previewDoc.name} className="max-w-full max-h-[500px] object-contain rounded-md shadow-xs" />
                    </div>
                  ) : (
                    <iframe
                      src={resolvedPreviewUrl}
                      title={previewDoc.name}
                      className="w-full h-full min-h-[420px] border-0 rounded-lg bg-white"
                    />
                  )
                ) : (
                  <div className="p-8 text-center space-y-3">
                    <FileText className="w-12 h-12 text-[#58051E]/40 mx-auto" />
                    <p className="text-sm font-semibold text-slate-800">Compliance Document File Registered</p>
                    <p className="text-xs text-slate-500 max-w-sm mx-auto">
                      This document is securely logged under your FEREX compliance record.
                    </p>
                  </div>
                )}
              </div>

              {/* Footer Actions */}
              <div className="flex items-center justify-between pt-2 border-t border-slate-100 flex-wrap gap-2">
                <div className="text-xs text-slate-500">
                  Uploaded on: <span className="font-semibold text-slate-800">{previewDoc.date}</span>
                </div>
                <div className="flex items-center gap-2">
                  {resolvedPreviewUrl && (
                    <a
                      href={resolvedPreviewUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="px-3.5 py-1.5 bg-[#58051E] text-white text-xs font-semibold rounded-lg hover:bg-[#430417] transition-colors inline-flex items-center gap-1.5 shadow-subtle"
                    >
                      <ExternalLink className="w-3.5 h-3.5" /> Open in New Tab
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
