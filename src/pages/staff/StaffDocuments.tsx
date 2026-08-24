import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FileText, CheckCircle2, Upload, X, Folder } from 'lucide-react';
import { Card } from '../../components/Card';
import { Button } from '../../components/Button';

const folderCategories = [
  { name: 'Academic SOPs', count: 4, icon: Folder, color: 'text-amber-600 bg-amber-50' },
  { name: 'Passport & Identity', count: 6, icon: Folder, color: 'text-blue-600 bg-blue-50' },
  { name: 'Financial Solvency', count: 3, icon: Folder, color: 'text-emerald-600 bg-emerald-50' },
  { name: 'Language Scorecards', count: 5, icon: Folder, color: 'text-purple-600 bg-purple-50' },
];

const documentsList = [
  { id: 'DOC-101', title: 'Passport Scan & Bio Page', student: 'Priya Sharma (STU-842)', category: 'Identity Proof', status: 'Approved', ocr: '✓ OCR Verified 100%', size: '2.4 MB', date: '2026-08-04' },
  { id: 'DOC-102', title: 'Statement of Purpose (SOP v2)', student: 'Priya Sharma (STU-842)', category: 'Academic SOP', status: 'Under Review', ocr: '✓ Plagiarism Score 2%', size: '1.1 MB', date: '2026-08-05' },
  { id: 'DOC-103', title: 'Bank Solvency Certificate (₹25L)', student: 'Rahul Verma (STU-889)', category: 'Financial Proof', status: 'Pending Review', ocr: '✓ Bank Stamp Authenticated', size: '3.8 MB', date: '2026-08-06' },
  { id: 'DOC-104', title: 'IELTS Official Scorecard (7.5)', student: 'Ananya Roy (STU-912)', category: 'Language Test', status: 'Approved', ocr: '✓ IELTS TRF Verified', size: '850 KB', date: '2026-08-02' },
  { id: 'DOC-105', title: 'Expired Affidavit Copy', student: 'Priya Sharma (STU-842)', category: 'Legal Affidavit', status: 'Rejected', ocr: '✕ Expired Validity Date', size: '920 KB', date: '2026-08-01' },
];

export const StaffDocuments: React.FC = () => {
  const [toast, setToast] = useState('');
  const [activeTab, setActiveTab] = useState('All');
  const [showUploadModal, setShowUploadModal] = useState(false);

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(''), 3000); };

  const tabs = ['All', 'Pending Review', 'Under Review', 'Approved', 'Rejected'];
  const filteredDocs = documentsList.filter(d => activeTab === 'All' || d.status === activeTab);

  return (
    <div className="space-y-6 text-left antialiased select-none">
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
          <p className="text-xs font-semibold text-slate-500 mt-1">Review student visa files, academic transcripts, bank solvency letters, and OCR authentications.</p>
        </div>
        <Button size="sm" className="bg-[#6A1B2E] hover:bg-[#521221] text-xs font-bold" onClick={() => setShowUploadModal(true)}>
          <Upload className="w-4 h-4 mr-1.5" /> Upload New Version
        </Button>
      </div>

      {/* Folder Experience Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {folderCategories.map((folder, idx) => (
          <Card key={idx} className="p-4 border border-slate-200/80 shadow-xs hover:shadow-md transition-all flex items-center gap-3 cursor-pointer" onClick={() => showToast(`Filtered folder: ${folder.name}`)}>
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold ${folder.color}`}>
              <Folder className="w-4 h-4" />
            </div>
            <div>
              <h4 className="text-xs font-black text-slate-900">{folder.name}</h4>
              <span className="text-[10px] text-slate-400 font-bold block">{folder.count} Documents</span>
            </div>
          </Card>
        ))}
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        {tabs.map(tab => (
          <button key={tab} onClick={() => setActiveTab(tab)} className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 ${activeTab === tab ? 'bg-[#6A1B2E] text-white shadow-xs' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>{tab}</button>
        ))}
      </div>

      {/* Main Document Table */}
      <Card className="p-6 border border-slate-200/80 shadow-xs space-y-4">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200/80 text-[10px] font-black uppercase text-slate-400">
                <th className="py-2.5 px-3">Document Title</th>
                <th className="py-2.5 px-3">Student Name</th>
                <th className="py-2.5 px-3">OCR Verification</th>
                <th className="py-2.5 px-3">Status</th>
                <th className="py-2.5 px-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs font-semibold text-slate-700">
              {filteredDocs.map(doc => (
                <tr key={doc.id} className="hover:bg-slate-50/80">
                  <td className="py-3 px-3">
                    <div className="font-extrabold text-slate-900">{doc.title}</div>
                    <span className="text-[10px] text-slate-400">{doc.id} • {doc.size}</span>
                  </td>
                  <td className="py-3 px-3 font-bold text-slate-800">{doc.student}</td>
                  <td className="py-3 px-3">
                    <span className="text-[10.5px] font-bold text-slate-700 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">{doc.ocr}</span>
                  </td>
                  <td className="py-3 px-3">
                    <span className={`px-2.5 py-0.5 rounded text-[10px] font-black ${doc.status === 'Approved' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : doc.status === 'Rejected' ? 'bg-red-50 text-red-700 border border-red-200' : 'bg-amber-50 text-amber-700 border border-amber-200'}`}>{doc.status}</span>
                  </td>
                  <td className="py-3 px-3 text-right space-x-2">
                    <button onClick={() => showToast(`Previewing ${doc.title}...`)} className="text-[10px] font-black text-slate-600 hover:underline">Preview</button>
                    <button onClick={() => showToast(`Downloading ${doc.title}...`)} className="text-[10px] font-black text-[#6A1B2E] hover:underline">Download</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Upload Modal */}
      <AnimatePresence>
        {showUploadModal && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 0.4 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-slate-900 z-40" onClick={() => setShowUploadModal(false)} />
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-full max-w-md bg-white rounded-3xl p-6 shadow-2xl space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <h3 className="text-sm font-black text-slate-900">Upload New Document Version</h3>
                <button onClick={() => setShowUploadModal(false)} className="p-1 text-slate-400 hover:text-slate-600"><X className="w-4 h-4" /></button>
              </div>
              <div className="p-8 bg-slate-50 rounded-2xl border-2 border-dashed border-slate-300 text-center space-y-2 cursor-pointer hover:bg-slate-100/60" onClick={() => { showToast('Simulated document upload complete!'); setShowUploadModal(false); }}>
                <Upload className="w-8 h-8 text-[#6A1B2E] mx-auto" />
                <span className="text-xs font-bold text-slate-700 block">Click or Drag PDF Document Here</span>
                <span className="text-[10px] text-slate-400 block">Supports PDF, PNG, JPEG up to 15 MB</span>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};
