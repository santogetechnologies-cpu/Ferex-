import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Folder, Search, CheckCircle2, FileText, Eye, ShieldCheck, X } from 'lucide-react';
import { Card } from '../../components/Card';
import { Button } from '../../components/Button';

export const CentralDocuments: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDoc, setSelectedDoc] = useState<any>(null);
  const [toast, setToast] = useState('');

  const [documents, setDocuments] = useState([
    {
      id: 1,
      name: 'Ashly_Passport_Scan.pdf',
      student: 'Ashly',
      type: 'Identity Verification',
      verifiedBy: 'Senior Counselor',
      date: 'Aug 04, 2026',
      status: 'Verified',
      statusBadge: 'bg-emerald-50 text-emerald-700 border-emerald-200'
    },
    {
      id: 2,
      name: 'Ashly_IELTS_Scorecard.pdf',
      student: 'Ashly',
      type: 'Language Certificate',
      verifiedBy: 'Anita Roy',
      date: 'Jul 28, 2026',
      status: 'Verified',
      statusBadge: 'bg-emerald-50 text-emerald-700 border-emerald-200'
    },
    {
      id: 3,
      name: 'Rahul_Mehta_BTech_Transcript.pdf',
      student: 'Rahul Mehta',
      type: 'Academic Record',
      verifiedBy: 'Pending Staff Review',
      date: 'Aug 05, 2026',
      status: 'Pending Audit',
      statusBadge: 'bg-amber-50 text-amber-700 border-amber-200'
    }
  ]);

  const showToastMsg = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(''), 3000);
  };

  const handleVerifyDoc = (id: number) => {
    setDocuments(documents.map(d => d.id === id ? { ...d, status: 'Verified', statusBadge: 'bg-emerald-50 text-emerald-700 border-emerald-200', verifiedBy: 'Super Admin' } : d));
    showToastMsg('Document marked as Verified in Central Vault!');
    setSelectedDoc(null);
  };

  const filteredDocs = documents.filter(d =>
    d.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    d.student.toLowerCase().includes(searchQuery.toLowerCase()) ||
    d.type.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6 text-left">
      <AnimatePresence>
        {toast && (
          <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="fixed top-20 right-8 z-50 bg-[#6A1B2E] text-white text-xs font-bold px-4 py-2.5 rounded-xl shadow-xl flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            {toast}
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <Folder className="w-5 h-5 text-[#6A1B2E]" /> Central Document Inspection Vault
          </h1>
          <p className="text-xs font-semibold text-slate-500 mt-1">
            Super Admin Console • Global document compliance, passports, IELTS scorecards, and NAWA transcripts.
          </p>
        </div>
      </div>

      <Card className="p-4 border border-slate-200/70 shadow-xs flex items-center justify-between">
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Search file name or student..." className="w-full h-9 pl-9 pr-4 bg-slate-100/70 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:bg-white focus:outline-none focus:border-[#6A1B2E]" />
        </div>
        <span className="text-xs font-bold text-slate-400">{filteredDocs.length} Vault Files</span>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {filteredDocs.map((doc) => (
          <Card key={doc.id} className="p-5 border border-slate-200/70 shadow-xs flex flex-col justify-between hover:shadow-md transition-all">
            <div>
              <div className="flex items-start justify-between mb-3">
                <div className="w-10 h-10 rounded-xl bg-[#6A1B2E]/10 text-[#6A1B2E] flex items-center justify-center">
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
              <button onClick={() => setSelectedDoc(doc)} className="flex items-center gap-1 text-xs font-bold text-[#6A1B2E] hover:underline">
                <Eye className="w-3.5 h-3.5" /> Inspect File
              </button>
            </div>
          </Card>
        ))}
      </div>

      {/* Inspect File Modal */}
      <AnimatePresence>
        {selectedDoc && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50" onClick={() => setSelectedDoc(null)} />
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-lg bg-white rounded-2xl shadow-2xl z-50 border border-slate-100 p-6">
              <div className="flex items-center justify-between mb-4 pb-2 border-b border-slate-100">
                <h3 className="text-sm font-black text-slate-900">Document Compliance Preview</h3>
                <button onClick={() => setSelectedDoc(null)} className="p-1 text-slate-400 hover:text-slate-600"><X className="w-4 h-4" /></button>
              </div>

              <div className="p-6 bg-slate-50 rounded-2xl border border-slate-200/80 text-center space-y-3 mb-4">
                <FileText className="w-12 h-12 text-[#6A1B2E] mx-auto" />
                <div>
                  <h4 className="text-sm font-black text-slate-900">{selectedDoc.name}</h4>
                  <p className="text-xs font-semibold text-slate-500">{selectedDoc.type} · {selectedDoc.student}</p>
                </div>
                <div className="text-[11px] font-bold text-emerald-700 bg-emerald-50 px-3 py-1 rounded-full inline-block">
                  Security Hash & Verification Passed
                </div>
              </div>

              <div className="flex gap-2">
                <Button variant="outline" size="sm" className="flex-1 text-xs font-bold" onClick={() => setSelectedDoc(null)}>Close</Button>
                {selectedDoc.status !== 'Verified' && (
                  <Button size="sm" className="flex-1 text-xs font-bold bg-[#6A1B2E] hover:bg-[#521221]" onClick={() => handleVerifyDoc(selectedDoc.id)}>
                    <ShieldCheck className="w-4 h-4 mr-1.5" /> Approve Document
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
