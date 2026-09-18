import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Folder, Search, CheckCircle2, FileText, Eye, ShieldCheck, X, RefreshCw } from 'lucide-react';
import { Card } from '../../components/Card';
import { Button } from '../../components/Button';
import { getDocumentsForAdmin, updateDocumentStatus } from '../../lib/api/documents';
import { supabase } from '../../lib/supabase';

export const CentralDocuments: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDoc, setSelectedDoc] = useState<any>(null);
  const [toast, setToast] = useState('');
  const [documents, setDocuments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const showToastMsg = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(''), 3000);
  };

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getDocumentsForAdmin();
      const formatted = (data || []).map((d: any, idx: number) => ({
        id: d.id || `DOC-${idx + 1}`,
        rawId: d.id,
        name: d.file_name || d.name || 'Document File',
        student: d.users?.full_name || 'Student Applicant',
        type: d.doc_type || d.document_type || 'Identity Verification',
        verifiedBy: d.status === 'Verified' ? (d.reviewer_id || 'Super Admin') : 'Pending Staff Review',
        date: d.uploaded_at ? new Date(d.uploaded_at).toLocaleDateString() : 'Recent',
        status: d.status || 'Submitted',
        fileUrl: d.file_url || '',
        statusBadge: d.status === 'Verified' || d.status === 'Approved'
          ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
          : 'bg-amber-50 text-amber-700 border-amber-200',
      }));
      setDocuments(formatted);
    } catch (err: any) {
      console.warn('[CentralDocuments load error]:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();

    // Supabase Realtime synchronization
    const channel = supabase
      .channel('central_documents_realtime_sync')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'student_documents' }, () => loadData())
      .subscribe();

    const handleSync = () => loadData();
    window.addEventListener('ferex_document_change', handleSync);

    return () => {
      supabase.removeChannel(channel);
      window.removeEventListener('ferex_document_change', handleSync);
    };
  }, [loadData]);

  const handleVerifyDoc = async (rawId: string) => {
    try {
      await updateDocumentStatus(rawId, 'Approved', 'Super Admin');
      setDocuments(prev => prev.map(d => d.rawId === rawId ? {
        ...d,
        status: 'Approved',
        statusBadge: 'bg-emerald-50 text-emerald-700 border-emerald-200',
        verifiedBy: 'Super Admin'
      } : d));
      showToastMsg('Document verified & approved in Supabase vault!');
      setSelectedDoc(null);
    } catch (err: any) {
      showToastMsg(`Verification failed: ${err.message}`);
    }
  };

  const filteredDocs = documents.filter(d =>
    d.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    d.student.toLowerCase().includes(searchQuery.toLowerCase()) ||
    d.type.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6 text-left antialiased">
      <AnimatePresence>
        {toast && (
          <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="fixed top-20 right-8 z-50 bg-[#58051E] text-white text-xs font-bold px-4 py-2.5 rounded-xl shadow-xl flex items-center gap-2 border border-white/20">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            {toast}
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-black text-slate-900 tracking-tight flex items-center gap-2">
              <Folder className="w-6 h-6 text-[#58051E]" /> Central Document Inspection Vault
            </h1>
            <span className="text-[10px] font-black bg-[#58051E]/10 text-[#58051E] border border-[#58051E]/20 px-2.5 py-0.5 rounded-full">
              Live Supabase Sync
            </span>
          </div>
          <p className="text-xs font-semibold text-slate-500 mt-1">
            Executive oversight of international applicant passports, IELTS scorecards, academic certificates, and NAWA legalization dossiers.
          </p>
        </div>
        <Button size="sm" variant="outline" className="text-xs font-bold" onClick={loadData}>
          <RefreshCw className="w-3.5 h-3.5 mr-1" /> Refresh Vault
        </Button>
      </div>

      <Card className="p-4 border border-slate-200/70 shadow-xs flex items-center justify-between">
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search file name, student, or document type..."
            className="w-full h-9 pl-9 pr-4 bg-slate-100/70 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:bg-white focus:outline-none focus:border-[#58051E]"
          />
        </div>
        <span className="text-xs font-bold text-slate-400">{filteredDocs.length} Vault Documents</span>
      </Card>

      {loading ? (
        <div className="p-12 text-center text-xs font-bold text-slate-400">Loading student documents from Supabase...</div>
      ) : filteredDocs.length === 0 ? (
        <Card className="p-12 text-center border border-slate-200/70 shadow-xs">
          <Folder className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <h3 className="text-sm font-black text-slate-800">No Documents in Vault</h3>
          <p className="text-xs font-semibold text-slate-400 mt-1 max-w-sm mx-auto">
            No uploaded student documents match the search criteria.
          </p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {filteredDocs.map((doc) => (
            <Card key={doc.id} className="p-5 border border-slate-200/70 shadow-xs flex flex-col justify-between hover:shadow-md transition-all">
              <div>
                <div className="flex items-start justify-between mb-3">
                  <div className="w-10 h-10 rounded-xl bg-[#58051E]/10 text-[#58051E] flex items-center justify-center">
                    <FileText className="w-5 h-5" />
                  </div>
                  <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold border ${doc.statusBadge}`}>
                    {doc.status}
                  </span>
                </div>
                <h3 className="text-xs font-black text-slate-900 truncate">{doc.name}</h3>
                <p className="text-[11px] font-semibold text-slate-500 mt-0.5">Student: <span className="font-extrabold text-slate-900">{doc.student}</span></p>

                <div className="mt-3 pt-3 border-t border-slate-100 space-y-1 text-[10.5px] font-semibold text-slate-500">
                  <div>Type: <span className="font-bold text-slate-800">{doc.type}</span></div>
                  <div>Audited By: <span className="font-bold text-slate-800">{doc.verifiedBy}</span></div>
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
                <span className="text-[10px] font-bold text-slate-400">{doc.date}</span>
                <button onClick={() => setSelectedDoc(doc)} className="flex items-center gap-1 text-xs font-bold text-[#58051E] hover:underline cursor-pointer">
                  <Eye className="w-3.5 h-3.5" /> Inspect File
                </button>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Inspect File Modal */}
      <AnimatePresence>
        {selectedDoc && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50" onClick={() => setSelectedDoc(null)} />
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-lg bg-white rounded-2xl shadow-2xl z-50 border border-slate-100 p-6 text-left">
              <div className="flex items-center justify-between mb-4 pb-2 border-b border-slate-100">
                <h3 className="text-sm font-black text-slate-900">Document Compliance Inspection</h3>
                <button onClick={() => setSelectedDoc(null)} className="p-1 text-slate-400 hover:text-slate-600 cursor-pointer"><X className="w-4 h-4" /></button>
              </div>

              <div className="p-6 bg-slate-50 rounded-2xl border border-slate-200/80 text-center space-y-3 mb-4">
                <FileText className="w-12 h-12 text-[#58051E] mx-auto" />
                <div>
                  <h4 className="text-sm font-black text-slate-900">{selectedDoc.name}</h4>
                  <p className="text-xs font-semibold text-slate-500">{selectedDoc.type} · {selectedDoc.student}</p>
                </div>
                <div className={`text-[11px] font-bold px-3 py-1 rounded-full inline-block border ${selectedDoc.statusBadge}`}>
                  Audit Status: {selectedDoc.status}
                </div>
              </div>

              <div className="flex gap-2">
                <Button variant="outline" size="sm" className="flex-1 text-xs font-bold" onClick={() => setSelectedDoc(null)}>Close</Button>
                {selectedDoc.status !== 'Verified' && selectedDoc.status !== 'Approved' && (
                  <Button size="sm" className="flex-1 text-xs font-bold bg-[#58051E] hover:bg-[#430316]" onClick={() => handleVerifyDoc(selectedDoc.rawId)}>
                    <ShieldCheck className="w-4 h-4 mr-1.5" /> Approve & Verify Document
                  </Button>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};
