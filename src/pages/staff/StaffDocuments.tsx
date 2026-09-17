import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FileText, CheckCircle2, XCircle, Search, AlertCircle, RotateCcw,
  Eye, Check, ShieldCheck, Clock, ExternalLink, X, FileCheck
} from 'lucide-react';
import { Card } from '../../components/Card';
import { Button } from '../../components/Button';
import { useDocuments } from '../../hooks/useDocuments';
import { useAuth } from '../../contexts/AuthContext';
import { getStudents } from '../../lib/api/students';
import type { StudentDocument } from '../../lib/types';

export const StaffDocuments: React.FC = () => {
  const { user, profile } = useAuth();
  const { documents: dbDocs, loading, error, refresh, changeStatus } = useDocuments();
  const [students, setStudents] = useState<any[]>([]);
  const [toast, setToast] = useState('');
  const [activeTab, setActiveTab] = useState<'All' | 'Pending' | 'Verified' | 'Rejected'>('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [rejectionModalDoc, setRejectionModalDoc] = useState<any | null>(null);
  const [rejectionNote, setRejectionNote] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  const counselorName = profile?.full_name || user?.user_metadata?.full_name || 'Admissions Counselor';

  useEffect(() => {
    getStudents().then(setStudents).catch(() => {});
  }, []);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(''), 3500);
  };

  // Map student names
  const documentsList = useMemo(() => {
    const studentMap = new Map(
      students.map(s => [s.id, s.full_name || s.name || s.email?.split('@')[0] || 'Student'])
    );

    return dbDocs.map(d => {
      const studentName =
        studentMap.get(d.student_id) ||
        (d as any).student_name ||
        (d as any).users?.full_name ||
        'Student Candidate';

      const raw = (d.status || 'Pending').toLowerCase();
      let normStatus: 'Pending' | 'Verified' | 'Rejected' = 'Pending';
      if (raw.includes('verified') || raw.includes('approved')) {
        normStatus = 'Verified';
      } else if (raw.includes('reject') || raw.includes('re-upload')) {
        normStatus = 'Rejected';
      }

      return {
        id: d.id,
        rawDoc: d,
        title: d.file_name || d.doc_type || 'Document File',
        student: studentName,
        studentId: d.student_id,
        category: d.doc_type || 'Academic File',
        status: normStatus,
        rawStatus: d.status,
        notes: d.reviewer_notes || '',
        size: d.file_size || '1.2 MB',
        date: d.uploaded_at
          ? new Date(d.uploaded_at).toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' })
          : 'Recent',
        url: d.file_url || '',
      };
    });
  }, [dbDocs, students]);

  const counts = useMemo(() => {
    return {
      all: documentsList.length,
      pending: documentsList.filter(d => d.status === 'Pending').length,
      verified: documentsList.filter(d => d.status === 'Verified').length,
      rejected: documentsList.filter(d => d.status === 'Rejected').length,
    };
  }, [documentsList]);

  const filteredDocs = useMemo(() => {
    return documentsList.filter(d => {
      const matchesTab = activeTab === 'All' || d.status === activeTab;
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        d.title.toLowerCase().includes(q) ||
        d.student.toLowerCase().includes(q) ||
        d.category.toLowerCase().includes(q) ||
        d.id.toLowerCase().includes(q);

      return matchesTab && matchesSearch;
    });
  }, [documentsList, activeTab, searchQuery]);

  // Actions
  const handleApprove = async (doc: any) => {
    try {
      setIsProcessing(true);
      await changeStatus(
        doc.id,
        'Approved',
        `Verified by Admissions Counselor (${counselorName})`,
        user?.id
      );
      showToast(`Document "${doc.title}" verified and approved successfully.`);
    } catch (err: any) {
      showToast(`Verification error: ${err.message || 'Database error'}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleRejectSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rejectionModalDoc || !rejectionNote.trim()) return;

    try {
      setIsProcessing(true);
      await changeStatus(
        rejectionModalDoc.id,
        'Rejected',
        rejectionNote.trim(),
        user?.id
      );
      showToast(`Document rejected. Feedback sent to student via Supabase.`);
      setRejectionModalDoc(null);
      setRejectionNote('');
    } catch (err: any) {
      showToast(`Error: ${err.message || 'Failed to reject document'}`);
    } finally {
      setIsProcessing(false);
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
              <ShieldCheck className="w-3 h-3 text-[#58051E]" /> ADMISSIONS VERIFICATION DESK
            </span>
            <span className="text-[10px] font-bold text-slate-400">● Realtime Supabase Storage & Records</span>
          </div>
          <h1 className="text-2xl font-black text-slate-900 mt-1 flex items-center gap-2">
            <FileText className="w-6 h-6 text-[#58051E]" /> Document Verification
          </h1>
          <p className="text-xs font-semibold text-slate-500 mt-0.5">
            Review and authenticate student academic transcripts, passports, financial affidavits, and language test certificates.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Button
            size="sm"
            variant="outline"
            onClick={() => refresh()}
            disabled={loading}
            className="text-xs font-bold border-slate-200 text-slate-700 hover:bg-slate-50"
          >
            <RotateCcw className={`w-3.5 h-3.5 mr-1.5 ${loading ? 'animate-spin text-[#58051E]' : ''}`} />
            Refresh Documents
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Total Dossiers', val: counts.all, color: 'text-slate-900', border: 'border-slate-200' },
          { label: 'Pending Review', val: counts.pending, color: 'text-amber-700', border: 'border-amber-200 bg-amber-50/20' },
          { label: 'Verified & Approved', val: counts.verified, color: 'text-emerald-700', border: 'border-emerald-200 bg-emerald-50/20' },
          { label: 'Rejected / Re-upload', val: counts.rejected, color: 'text-rose-700', border: 'border-rose-200 bg-rose-50/20' },
        ].map((kpi, idx) => (
          <Card key={idx} className={`p-4 border ${kpi.border} shadow-xs`}>
            <span className="text-[10px] font-extrabold uppercase text-slate-400 block">{kpi.label}</span>
            <span className={`text-2xl font-black ${kpi.color} block mt-1`}>
              {loading ? '—' : kpi.val}
            </span>
          </Card>
        ))}
      </div>

      {/* Toolbar */}
      <Card className="p-4 border border-slate-200/80 shadow-xs space-y-3">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
          {/* Status Filter */}
          <div className="flex items-center gap-1.5 w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0">
            {(['All', 'Pending', 'Verified', 'Rejected'] as const).map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                  activeTab === tab
                    ? 'bg-[#58051E] text-white shadow-xs'
                    : 'bg-slate-100/80 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {tab}
                <span className="ml-1.5 text-[10px] opacity-75">
                  ({tab === 'All' ? counts.all : tab === 'Pending' ? counts.pending : tab === 'Verified' ? counts.verified : counts.rejected})
                </span>
              </button>
            ))}
          </div>

          {/* Search Input */}
          <div className="relative w-full sm:w-72">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search by student, file, or type..."
              className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-[#58051E]"
            />
          </div>
        </div>
      </Card>

      {/* Real DB Error Alert */}
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
            onClick={() => refresh()}
            className="bg-[#58051E] text-white hover:bg-[#430316] font-bold text-xs"
          >
            <RotateCcw className="w-3.5 h-3.5 mr-1.5" /> Retry Connection
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
      {!loading && !error && filteredDocs.length === 0 && (
        <Card className="p-12 border border-slate-200/80 shadow-xs text-center space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
            <FileCheck className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-base font-black text-slate-800">
              {documentsList.length === 0 ? 'No documents awaiting verification' : 'No matching documents'}
            </h3>
            <p className="text-xs font-semibold text-slate-400 mt-1 max-w-sm mx-auto leading-relaxed">
              {documentsList.length === 0
                ? 'There are currently zero documents uploaded by students in the database. When applicants upload files, they will appear here in real time.'
                : 'No documents match your active status tab or search query.'}
            </p>
          </div>
        </Card>
      )}

      {/* Real Documents Table */}
      {!loading && !error && filteredDocs.length > 0 && (
        <Card className="border border-slate-200/80 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200/80 text-[10px] font-black uppercase text-slate-400 tracking-wider">
                  <th className="py-3 px-4">Document Details</th>
                  <th className="py-3 px-4">Student Candidate</th>
                  <th className="py-3 px-4">Category</th>
                  <th className="py-3 px-4">Uploaded</th>
                  <th className="py-3 px-4">Verification Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs font-semibold text-slate-700">
                {filteredDocs.map(doc => {
                  return (
                    <tr key={doc.id} className="hover:bg-slate-50/70 transition-all">
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-lg bg-[#58051E]/10 text-[#58051E] font-black flex items-center justify-center text-xs shrink-0">
                            <FileText className="w-4 h-4 text-[#58051E]" />
                          </div>
                          <div>
                            <span className="font-extrabold text-slate-900 block leading-tight">{doc.title}</span>
                            <span className="text-[10px] text-slate-400 font-medium block mt-0.5">
                              Size: {doc.size}
                            </span>
                          </div>
                        </div>
                      </td>
                      <td className="py-3.5 px-4 font-bold text-slate-900">
                        {doc.student}
                      </td>
                      <td className="py-3.5 px-4 text-slate-600">
                        {doc.category}
                      </td>
                      <td className="py-3.5 px-4 text-slate-500">
                        {doc.date}
                      </td>
                      <td className="py-3.5 px-4">
                        <span
                          className={`px-2.5 py-0.5 rounded text-[10px] font-black border ${
                            doc.status === 'Verified'
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                              : doc.status === 'Rejected'
                              ? 'bg-rose-50 text-rose-700 border-rose-200'
                              : 'bg-amber-50 text-amber-800 border-amber-200'
                          }`}
                        >
                          {doc.rawStatus || doc.status}
                        </span>
                        {doc.notes && (
                          <span className="text-[10px] text-slate-400 block mt-0.5 truncate max-w-[150px]">
                            {doc.notes}
                          </span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {doc.url && (
                            <a
                              href={doc.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-all"
                              title="Open in Supabase Storage"
                            >
                              <ExternalLink className="w-4 h-4" />
                            </a>
                          )}

                          {doc.status !== 'Verified' && (
                            <Button
                              size="sm"
                              onClick={() => handleApprove(doc)}
                              disabled={isProcessing}
                              className="bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs py-1 px-2.5 h-auto"
                            >
                              <Check className="w-3.5 h-3.5 mr-1" /> Verify
                            </Button>
                          )}

                          {doc.status !== 'Rejected' && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                setRejectionModalDoc(doc);
                                setRejectionNote(doc.notes || '');
                              }}
                              disabled={isProcessing}
                              className="border-rose-200 text-rose-700 hover:bg-rose-50 font-bold text-xs py-1 px-2.5 h-auto"
                            >
                              <XCircle className="w-3.5 h-3.5 mr-1" /> Reject
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Reject / Feedback Modal */}
      <AnimatePresence>
        {rejectionModalDoc && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.5 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-slate-900 z-50"
              onClick={() => setRejectionModalDoc(null)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-full max-w-md bg-white rounded-3xl p-6 shadow-2xl space-y-4 text-left"
            >
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div>
                  <h3 className="text-base font-black text-slate-900">Request Document Re-Upload</h3>
                  <span className="text-[10px] font-semibold text-slate-400">
                    Document: {rejectionModalDoc.title}
                  </span>
                </div>
                <button
                  onClick={() => setRejectionModalDoc(null)}
                  className="p-1 rounded-lg text-slate-400 hover:text-slate-600 cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleRejectSubmit} className="space-y-4">
                <div>
                  <label className="block text-[10px] font-black uppercase text-slate-400 mb-1">
                    Deficiency Notice / Rejection Reason
                  </label>
                  <textarea
                    required
                    value={rejectionNote}
                    onChange={e => setRejectionNote(e.target.value)}
                    placeholder="e.g. Scanned copy is illegible. Please upload high-resolution PDF with official stamp..."
                    rows={4}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:outline-none focus:ring-1 focus:ring-rose-500"
                  />
                </div>

                <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setRejectionModalDoc(null)}
                    className="text-xs font-bold"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    size="sm"
                    disabled={isProcessing || !rejectionNote.trim()}
                    className="bg-rose-600 hover:bg-rose-700 text-white font-black text-xs"
                  >
                    {isProcessing ? 'Saving in Supabase...' : 'Submit Rejection Feedback'}
                  </Button>
                </div>
              </form>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};
