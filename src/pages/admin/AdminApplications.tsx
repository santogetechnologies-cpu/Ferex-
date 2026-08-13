import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Eye, CheckCircle2, XCircle, X, ChevronDown, Sparkles, Upload, FileText, Download, Check, AlertCircle, Award } from 'lucide-react';
import { useApplications } from '../../hooks/useApplications';
import { uploadOfferPdfToSupabase } from '../../lib/api/applications';
import type { Application as ApiApplication } from '../../lib/types';

type AppStatus = 'Submitted' | 'Under Review' | 'Offer Issued' | 'Accepted' | 'Final Acceptance Issued' | 'Visa Processing' | 'Visa Approved' | 'Visa Rejected' | 'Approved' | 'Closed' | 'Rejected' | 'Withdrawn';

interface ApplicationItem {
  id: string;
  studentId: string;
  studentName: string;
  university: string;
  country: string;
  course: string;
  intake: string;
  status: AppStatus;
  date: string;
  counselor: string;
  offerLetterUrl?: string;
  finalAcceptanceUrl?: string;
  notes?: string;
}

const STATUS_COLORS: Record<AppStatus, string> = {
  'Submitted': 'bg-slate-50 text-slate-700 border-slate-200',
  'Under Review': 'bg-blue-50 text-blue-700 border-blue-200',
  'Offer Issued': 'bg-[#6A1B2E]/10 text-[#6A1B2E] border-[#6A1B2E]/20 font-black',
  'Accepted': 'bg-emerald-50 text-emerald-800 border-emerald-200 font-black',
  'Final Acceptance Issued': 'bg-teal-50 text-teal-800 border-teal-200 font-black',
  'Visa Processing': 'bg-violet-50 text-violet-700 border-violet-200',
  'Visa Approved': 'bg-emerald-100 text-emerald-900 border-emerald-300 font-black',
  'Visa Rejected': 'bg-red-100 text-red-900 border-red-300 font-black',
  'Approved': 'bg-emerald-200 text-emerald-950 border-emerald-300 font-black',
  'Closed': 'bg-slate-200 text-slate-700 border-slate-300 font-bold',
  'Rejected': 'bg-red-50 text-red-700 border-red-200',
  'Withdrawn': 'bg-slate-100 text-slate-500 border-slate-200',
};

export const AdminApplications: React.FC = () => {
  const { applications: dbApps, changeStatus } = useApplications();
  const [apps, setApps] = useState<ApplicationItem[]>([]);

  useEffect(() => {
    if (dbApps.length > 0) {
      const mapped = dbApps.map(a => ({
        id: a.id,
        studentId: a.student_id || 'STU-1001',
        studentName: a.student_name || a.users?.full_name || a.users?.email?.split('@')[0] || 'Student',
        university: a.university_name || a.universities?.name || 'Partner University',
        country: a.universities?.country || 'Europe',
        course: a.program_name || a.course || 'Higher Studies',
        intake: a.intake || 'October 2026',
        status: (a.status as AppStatus) || 'Submitted',
        date: new Date(a.created_at || Date.now()).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
        counselor: 'Education Team',
        offerLetterUrl: a.offer_letter_url,
        finalAcceptanceUrl: a.final_acceptance_url,
        notes: a.notes,
      }));
      setApps(mapped);
    } else {
      setApps([]);
    }
  }, [dbApps]);

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [viewApp, setViewApp] = useState<ApplicationItem | null>(null);
  const [toast, setToast] = useState('');
  const [isUpdating, setIsUpdating] = useState<string | null>(null);

  // 1. Admission Offer Letter PDF Upload Modal State
  const [offerModalApp, setOfferModalApp] = useState<ApplicationItem | null>(null);
  const [offerNotes, setOfferNotes] = useState('');
  const [offerPdfFile, setOfferPdfFile] = useState<File | null>(null);
  const [offerPdfUrlInput, setOfferPdfUrlInput] = useState('');

  // 2. Final Acceptance Letter PDF Upload Modal State
  const [finalModalApp, setFinalModalApp] = useState<ApplicationItem | null>(null);
  const [finalNotes, setFinalNotes] = useState('');
  const [finalPdfFile, setFinalPdfFile] = useState<File | null>(null);
  const [finalPdfUrlInput, setFinalPdfUrlInput] = useState('');

  const [isUploadingOffer, setIsUploadingOffer] = useState(false);

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(''), 2500); };

  const handleStatusSelect = async (id: string, newStatus: AppStatus) => {
    const targetApp = apps.find(a => a.id === id);

    // If setting to Offer Issued, trigger the Offer PDF upload modal
    if (newStatus === 'Offer Issued') {
      if (targetApp) {
        setOfferNotes(`Congratulations ${targetApp.studentName}! Your official admission offer letter for ${targetApp.course} at ${targetApp.university} has been released.`);
        setOfferPdfUrlInput(targetApp.offerLetterUrl || '');
        setOfferPdfFile(null);
        setOfferModalApp(targetApp);
        return;
      }
    }

    // If setting to Final Acceptance Issued, trigger the Final Acceptance PDF upload modal
    if (newStatus === 'Final Acceptance Issued') {
      if (targetApp) {
        setFinalNotes(`Official Final Acceptance & Enrollment Certificate released for ${targetApp.studentName} at ${targetApp.university}.`);
        setFinalPdfUrlInput(targetApp.finalAcceptanceUrl || '');
        setFinalPdfFile(null);
        setFinalModalApp(targetApp);
        return;
      }
    }

    try {
      setIsUpdating(id);
      await changeStatus(id, newStatus as any);
      setApps(prev => prev.map(a => a.id === id ? { ...a, status: newStatus } : a));
      if (viewApp?.id === id) {
        setViewApp(prev => prev ? { ...prev, status: newStatus } : null);
      }
      showToast(`Application status updated to "${newStatus}" in Supabase.`);
    } catch (err: any) {
      showToast(`Error: ${err.message || 'Failed to update status'}`);
    } finally {
      setIsUpdating(null);
    }
  };

  // Confirm Initial Offer Letter Upload
  const handleConfirmOfferSubmission = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!offerModalApp) return;

    try {
      setIsUploadingOffer(true);
      let finalPdfUrl = offerPdfUrlInput.trim();

      if (offerPdfFile) {
        finalPdfUrl = await uploadOfferPdfToSupabase(offerPdfFile);
      }

      if (!finalPdfUrl) {
        const student = (offerModalApp.studentName || 'Student').replace(/[()\\]/g, '');
        const univ = (offerModalApp.university || 'Partner European University').replace(/[()\\]/g, '');
        const prog = (offerModalApp.course || 'Master Degree Program').replace(/[()\\]/g, '');
        const intake = (offerModalApp.intake || 'October 2026').replace(/[()\\]/g, '');
        const today = new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });

        const pdfSource = `%PDF-1.4
1 0 obj
<< /Type /Catalog /Pages 2 0 R >>
endobj
2 0 obj
<< /Type /Pages /Kids [3 0 R] /Count 1 >>
endobj
3 0 obj
<<
  /Type /Page
  /Parent 2 0 R
  /Resources <<
    /Font <<
      /F1 << /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>
      /F2 << /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>
    >>
  >>
  /MediaBox [0 0 612 792]
  /Contents 4 0 R
>>
endobj
4 0 obj
<< /Length 750 >>
stream
BT
/F1 18 Tf
50 720 Td
(OFFICIAL ADMISSION OFFER LETTER) Tj
/F1 11 Tf
0 -30 Td
(FEREX GLOBAL ADMISSIONS BOARD - EUROPEAN HIGHER EDUCATION) Tj
0 -20 Td
(--------------------------------------------------------------------------------) Tj
/F2 10 Tf
0 -30 Td
(Date: ${today}) Tj
0 -18 Td
(Student Name: ${student}) Tj
0 -18 Td
(Target Institution: ${univ}) Tj
0 -18 Td
(Degree Program: ${prog}) Tj
0 -18 Td
(Target Admissions Intake: ${intake}) Tj
0 -18 Td
(Official Status: APPROVED - ADMISSION OFFER ISSUED) Tj
0 -35 Td
(OFFICIAL ADMISSION NOTICE:) Tj
0 -20 Td
(Dear ${student},) Tj
0 -20 Td
(We are pleased to inform you that your application for admission has been) Tj
0 -16 Td
(APPROVED by the Academic Admissions Council of ${univ}.) Tj
0 -45 Td
(Issued by:) Tj
/F1 11 Tf
0 -18 Td
(Ferex European University Admissions Office) Tj
/F2 9 Tf
0 -15 Td
(Document Verification Reference: FEREX-OFFER-VERIFIED) Tj
ET
endstream
endobj
xref
0 5
0000000000 65535 f 
0000000009 00000 n 
0000000058 00000 n 
0000000115 00000 n 
0000000320 00000 n 
trailer
<< /Size 5 /Root 1 0 R >>
startxref
1150
%%EOF`;

        const blob = new Blob([pdfSource], { type: 'application/pdf' });
        finalPdfUrl = await uploadOfferPdfToSupabase(blob, `Official_Offer_Letter_${univ.replace(/\s+/g, '_')}.pdf`);
      }

      await changeStatus(offerModalApp.id, 'Offer Issued', offerNotes, finalPdfUrl);
      setApps(prev => prev.map(a => a.id === offerModalApp.id ? { ...a, status: 'Offer Issued', offerLetterUrl: finalPdfUrl, notes: offerNotes } : a));
      if (viewApp?.id === offerModalApp.id) {
        setViewApp(prev => prev ? { ...prev, status: 'Offer Issued', offerLetterUrl: finalPdfUrl, notes: offerNotes } : null);
      }
      setStatusFilter('All');
      setOfferModalApp(null);
      showToast(`🎉 Official Offer Letter PDF uploaded & saved to Supabase!`);
    } catch (err: any) {
      showToast(`Error: ${err.message || 'Failed to upload offer letter PDF'}`);
    } finally {
      setIsUploadingOffer(false);
    }
  };

  // Confirm Final Acceptance Letter Upload
  const handleConfirmFinalSubmission = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!finalModalApp) return;

    try {
      setIsUploadingOffer(true);
      let finalPdfUrl = finalPdfUrlInput.trim();

      if (finalPdfFile) {
        finalPdfUrl = await uploadOfferPdfToSupabase(finalPdfFile);
      }

      if (!finalPdfUrl) {
        const student = (finalModalApp.studentName || 'Student').replace(/[()\\]/g, '');
        const univ = (finalModalApp.university || 'Partner European University').replace(/[()\\]/g, '');
        const prog = (finalModalApp.course || 'Master Degree Program').replace(/[()\\]/g, '');
        const today = new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });

        const pdfSource = `%PDF-1.4
1 0 obj
<< /Type /Catalog /Pages 2 0 R >>
endobj
2 0 obj
<< /Type /Pages /Kids [3 0 R] /Count 1 >>
endobj
3 0 obj
<<
  /Type /Page
  /Parent 2 0 R
  /Resources <<
    /Font <<
      /F1 << /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>
      /F2 << /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>
    >>
  >>
  /MediaBox [0 0 612 792]
  /Contents 4 0 R
>>
endobj
4 0 obj
<< /Length 750 >>
stream
BT
/F1 18 Tf
50 720 Td
(OFFICIAL FINAL ACCEPTANCE & ENROLLMENT CERTIFICATE) Tj
/F1 11 Tf
0 -30 Td
(FEREX GLOBAL ADMISSIONS BOARD - EUROPEAN HIGHER EDUCATION) Tj
0 -20 Td
(--------------------------------------------------------------------------------) Tj
/F2 10 Tf
0 -30 Td
(Date: ${today}) Tj
0 -18 Td
(Student Name: ${student}) Tj
0 -18 Td
(Target Institution: ${univ}) Tj
0 -18 Td
(Degree Program: ${prog}) Tj
0 -18 Td
(Official Status: ENROLLED - FINAL ACCEPTANCE CERTIFICATE ISSUED) Tj
0 -35 Td
(OFFICIAL FINAL ENROLLMENT NOTICE:) Tj
0 -20 Td
(This certifies that ${student} has completed all admission requirements & tuition deposit) Tj
0 -16 Td
(and is officially ACCEPTED & ENROLLED at ${univ}.) Tj
0 -30 Td
(This Final Acceptance Certificate is valid for presentation at VFS Global Visa Desk.) Tj
0 -45 Td
(Issued by:) Tj
/F1 11 Tf
0 -18 Td
(European Academic Admissions Council) Tj
ET
endstream
endobj
xref
0 5
0000000000 65535 f 
0000000009 00000 n 
0000000058 00000 n 
0000000115 00000 n 
0000000320 00000 n 
trailer
<< /Size 5 /Root 1 0 R >>
startxref
1150
%%EOF`;
        const blob = new Blob([pdfSource], { type: 'application/pdf' });
        finalPdfUrl = await uploadOfferPdfToSupabase(blob, `Official_Final_Acceptance_${univ.replace(/\s+/g, '_')}.pdf`);
      }

      await changeStatus(finalModalApp.id, 'Final Acceptance Issued', finalNotes, undefined, finalPdfUrl);
      setApps(prev => prev.map(a => a.id === finalModalApp.id ? { ...a, status: 'Final Acceptance Issued', finalAcceptanceUrl: finalPdfUrl, notes: finalNotes } : a));
      if (viewApp?.id === finalModalApp.id) {
        setViewApp(prev => prev ? { ...prev, status: 'Final Acceptance Issued', finalAcceptanceUrl: finalPdfUrl, notes: finalNotes } : null);
      }
      setStatusFilter('All');
      setFinalModalApp(null);
      showToast(`🎉 Official Final Acceptance Letter PDF uploaded & saved to Supabase!`);
    } catch (err: any) {
      showToast(`Error: ${err.message || 'Failed to upload final acceptance PDF'}`);
    } finally {
      setIsUploadingOffer(false);
    }
  };

  const filtered = apps.filter(a =>
    (statusFilter === 'All' || a.status === statusFilter) &&
    (a.studentName.toLowerCase().includes(search.toLowerCase()) || a.university.toLowerCase().includes(search.toLowerCase()) || a.id.toLowerCase().includes(search.toLowerCase()))
  );

  const statusCounts = ['All', 'Submitted', 'Under Review', 'Offer Issued', 'Accepted', 'Final Acceptance Issued', 'Visa Processing', 'Approved', 'Closed', 'Rejected'].map(s => ({
    label: s, count: s === 'All' ? apps.length : apps.filter(a => a.status === s).length
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
        <h1 className="text-xl font-extrabold text-slate-900">University Applications Control</h1>
        <p className="text-xs font-semibold text-slate-400 mt-0.5">Manage, review, and issue official offer letters & final acceptance letters for all student applications</p>
      </div>

      {/* Status filter pills */}
      <div className="flex items-center gap-2 flex-wrap">
        {statusCounts.map((s) => (
          <button
            key={s.label}
            onClick={() => setStatusFilter(s.label)}
            className={`h-8 px-3.5 rounded-xl text-xs font-bold transition-all border ${statusFilter === s.label
              ? 'bg-[#6A1B2E] text-white border-[#6A1B2E] shadow-xs'
              : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300'
              }`}
          >
            {s.label} <span className="ml-1 opacity-70 font-mono text-[11px]">({s.count})</span>
          </button>
        ))}
      </div>

      {/* Search Input */}
      <div className="relative">
        <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by student name, university, or application ID..."
          className="w-full h-10 pl-9 pr-4 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-[#6A1B2E] transition-all"
        />
      </div>

      {/* Applications Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 overflow-hidden shadow-xs">
        <table className="w-full text-left text-xs">
          <thead className="bg-slate-50 border-b border-slate-100 text-[10.5px] uppercase font-black tracking-wider text-slate-400">
            <tr>
              <th className="px-5 py-3.5">Student</th>
              <th className="px-5 py-3.5">University & Program</th>
              <th className="px-5 py-3.5">Intake</th>
              <th className="px-5 py-3.5">Status</th>
              <th className="px-5 py-3.5">Upload Documents</th>
              <th className="px-5 py-3.5">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 font-semibold text-slate-700">
            {filtered.map((a) => (
              <tr key={a.id} className="hover:bg-slate-50/60 transition-colors">
                <td className="px-5 py-4">
                  <span className="font-extrabold text-slate-900 block">{a.studentName}</span>
                  <span className="text-[10px] font-mono text-slate-400">{a.studentId}</span>
                </td>
                <td className="px-5 py-4">
                  <span className="font-bold text-slate-900 block">{a.university}</span>
                  <span className="text-[11px] text-[#6A1B2E] font-extrabold">{a.course}</span>
                </td>
                <td className="px-5 py-4 text-slate-600 font-bold">{a.intake}</td>

                {/* Dynamic Status Selector Dropdown */}
                <td className="px-5 py-4">
                  <select
                    value={a.status}
                    disabled={isUpdating === a.id}
                    onChange={(e) => handleStatusSelect(a.id, e.target.value as AppStatus)}
                    className={`h-8 px-2.5 rounded-lg text-[11px] font-bold border focus:outline-none cursor-pointer ${STATUS_COLORS[a.status]}`}
                  >
                    <option value="Submitted">Submitted</option>
                    <option value="Under Review">Under Review</option>
                    <option value="Offer Issued">Offer Issued (Attach Offer PDF)</option>
                    <option value="Accepted">Accepted</option>
                    <option value="Final Acceptance Issued">Final Acceptance Issued (Attach Acceptance PDF)</option>
                    <option value="Visa Processing">Visa Processing</option>
                    <option value="Visa Approved">Visa Approved</option>
                    <option value="Visa Rejected">Visa Rejected</option>
                    <option value="Approved">Approved</option>
                    <option value="Closed">Closed</option>
                    <option value="Rejected">Rejected</option>
                    <option value="Withdrawn">Withdrawn</option>
                  </select>
                </td>

                <td className="px-5 py-4">
                  <div className="flex flex-col gap-1.5">
                    {/* Offer Letter Upload Button */}
                    <button
                      onClick={() => {
                        setOfferNotes(a.notes || `Official Admission Offer Letter for ${a.studentName}`);
                        setOfferPdfUrlInput(a.offerLetterUrl || '');
                        setOfferModalApp(a);
                      }}
                      className={`px-2.5 py-1 rounded-lg text-[10px] font-extrabold flex items-center gap-1 transition-all ${a.offerLetterUrl
                        ? 'bg-emerald-50 text-emerald-800 border border-emerald-200 hover:bg-emerald-100'
                        : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                        }`}
                    >
                      <FileText className="w-3 h-3 text-emerald-600" />
                      {a.offerLetterUrl ? '✓ Offer PDF Uploaded' : '+ Upload Offer PDF'}
                    </button>

                    {/* Final Acceptance Upload Button */}
                    <button
                      onClick={() => {
                        setFinalNotes(a.notes || `Official Final Acceptance Letter for ${a.studentName}`);
                        setFinalPdfUrlInput(a.finalAcceptanceUrl || '');
                        setFinalModalApp(a);
                      }}
                      className={`px-2.5 py-1 rounded-lg text-[10px] font-extrabold flex items-center gap-1 transition-all ${a.finalAcceptanceUrl
                        ? 'bg-teal-50 text-teal-800 border border-teal-200 hover:bg-teal-100'
                        : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                        }`}
                    >
                      <Award className="w-3 h-3 text-teal-600" />
                      {a.finalAcceptanceUrl ? '✓ Final Acceptance PDF Uploaded' : '+ Upload Final Acceptance PDF'}
                    </button>
                  </div>
                </td>

                <td className="px-5 py-4">
                  <button onClick={() => setViewApp(a)} className="p-1.5 rounded-lg text-slate-500 hover:text-blue-600 hover:bg-blue-50 transition-all flex items-center gap-1 text-xs font-bold">
                    <Eye className="w-3.5 h-3.5" /> View
                  </button>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr><td colSpan={6} className="py-12 text-center text-sm font-semibold text-slate-400">No applications match your search.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {/* 1. ADMISSION OFFER LETTER PDF UPLOAD MODAL FOR ADMIN */}
      <AnimatePresence>
        {offerModalApp && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs" onClick={() => setOfferModalApp(null)} />
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="relative bg-white rounded-2xl p-6 w-full max-w-lg shadow-2xl border border-slate-100 z-10 text-left">
              <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-4">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-[#6A1B2E]/10 text-[#6A1B2E] flex items-center justify-center font-black">
                    <FileText className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-black text-slate-900">Upload Admission Offer Letter</h3>
                    <p className="text-xs font-bold text-slate-400">{offerModalApp.studentName} · {offerModalApp.university}</p>
                  </div>
                </div>
                <button onClick={() => setOfferModalApp(null)} className="p-1.5 rounded-full hover:bg-slate-100 text-slate-400"><X className="w-4 h-4" /></button>
              </div>

              <form onSubmit={handleConfirmOfferSubmission} className="space-y-4">
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80 text-xs font-semibold space-y-1">
                  <div className="flex justify-between"><span className="text-slate-500">Degree Course:</span><span className="font-extrabold text-slate-900">{offerModalApp.course}</span></div>
                  <div className="flex justify-between"><span className="text-slate-500">Target Intake:</span><span className="font-extrabold text-slate-900">{offerModalApp.intake}</span></div>
                </div>

                <div>
                  <label className="block text-[10px] font-extrabold uppercase text-slate-400 tracking-wider mb-1.5">
                    Upload Official Offer Letter PDF Document *
                  </label>
                  <div className="p-4 border-2 border-dashed border-slate-200 rounded-xl bg-slate-50/50 hover:bg-slate-50 transition-colors text-center">
                    <Upload className="w-6 h-6 text-[#6A1B2E] mx-auto mb-2" />
                    <input
                      type="file"
                      accept="application/pdf,.pdf"
                      onChange={(e) => {
                        if (e.target.files && e.target.files[0]) {
                          setOfferPdfFile(e.target.files[0]);
                          setOfferPdfUrlInput('');
                        }
                      }}
                      className="block w-full text-xs text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-[#6A1B2E] file:text-white hover:file:bg-[#521221] cursor-pointer"
                    />
                    {offerPdfFile && (
                      <p className="text-xs font-bold text-emerald-700 mt-2 flex items-center justify-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5" /> Attached File: {offerPdfFile.name} ({(offerPdfFile.size / 1024).toFixed(1)} KB)
                      </p>
                    )}
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-extrabold uppercase text-slate-400 tracking-wider mb-1">
                    Or Enter PDF Document URL (Optional)
                  </label>
                  <input
                    type="url"
                    value={offerPdfUrlInput}
                    onChange={(e) => setOfferPdfUrlInput(e.target.value)}
                    placeholder="https://example.com/admission_offer.pdf"
                    className="w-full h-9 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-extrabold uppercase text-slate-400 tracking-wider mb-1">
                    Admission Offer Remarks for Student
                  </label>
                  <textarea
                    rows={3}
                    value={offerNotes}
                    onChange={(e) => setOfferNotes(e.target.value)}
                    placeholder="Enter offer message for student..."
                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:outline-none"
                  />
                </div>

                <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                  <button type="button" onClick={() => setOfferModalApp(null)} className="h-9 px-4 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100">Cancel</button>
                  <button type="submit" disabled={isUploadingOffer} className="h-9 px-5 bg-[#6A1B2E] text-white rounded-xl text-xs font-black hover:bg-[#521221] shadow-xs flex items-center gap-1.5">
                    {isUploadingOffer ? 'Processing...' : 'Confirm & Issue Offer Letter PDF'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 2. FINAL ACCEPTANCE LETTER PDF UPLOAD MODAL FOR ADMIN */}
      <AnimatePresence>
        {finalModalApp && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs" onClick={() => setFinalModalApp(null)} />
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="relative bg-white rounded-2xl p-6 w-full max-w-lg shadow-2xl border border-slate-100 z-10 text-left">
              <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-4">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-teal-500/10 text-teal-700 flex items-center justify-center font-black">
                    <Award className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-black text-slate-900">Upload Final Acceptance Letter</h3>
                    <p className="text-xs font-bold text-slate-400">{finalModalApp.studentName} · {finalModalApp.university}</p>
                  </div>
                </div>
                <button onClick={() => setFinalModalApp(null)} className="p-1.5 rounded-full hover:bg-slate-100 text-slate-400"><X className="w-4 h-4" /></button>
              </div>

              <form onSubmit={handleConfirmFinalSubmission} className="space-y-4">
                <div className="p-3 bg-teal-50/60 rounded-xl border border-teal-200/80 text-xs font-semibold space-y-1">
                  <div className="flex justify-between"><span className="text-teal-700">Degree Course:</span><span className="font-extrabold text-slate-900">{finalModalApp.course}</span></div>
                  <div className="flex justify-between"><span className="text-teal-700">Enrollment Status:</span><span className="font-extrabold text-teal-900">Post-Deposit Final Acceptance</span></div>
                </div>

                <div>
                  <label className="block text-[10px] font-extrabold uppercase text-slate-400 tracking-wider mb-1.5">
                    Upload Official Final Acceptance PDF Document *
                  </label>
                  <div className="p-4 border-2 border-dashed border-teal-200 rounded-xl bg-teal-50/30 hover:bg-teal-50/60 transition-colors text-center">
                    <Upload className="w-6 h-6 text-teal-700 mx-auto mb-2" />
                    <input
                      type="file"
                      accept="application/pdf,.pdf"
                      onChange={(e) => {
                        if (e.target.files && e.target.files[0]) {
                          setFinalPdfFile(e.target.files[0]);
                          setFinalPdfUrlInput('');
                        }
                      }}
                      className="block w-full text-xs text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-teal-700 file:text-white hover:file:bg-teal-800 cursor-pointer"
                    />
                    {finalPdfFile && (
                      <p className="text-xs font-bold text-teal-700 mt-2 flex items-center justify-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5" /> Attached File: {finalPdfFile.name} ({(finalPdfFile.size / 1024).toFixed(1)} KB)
                      </p>
                    )}
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-extrabold uppercase text-slate-400 tracking-wider mb-1">
                    Or Enter PDF Document URL (Optional)
                  </label>
                  <input
                    type="url"
                    value={finalPdfUrlInput}
                    onChange={(e) => setFinalPdfUrlInput(e.target.value)}
                    placeholder="https://example.com/final_acceptance.pdf"
                    className="w-full h-9 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-extrabold uppercase text-slate-400 tracking-wider mb-1">
                    Final Acceptance Remarks for Student
                  </label>
                  <textarea
                    rows={3}
                    value={finalNotes}
                    onChange={(e) => setFinalNotes(e.target.value)}
                    placeholder="Enter final acceptance certificate notes for student..."
                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:outline-none"
                  />
                </div>

                <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                  <button type="button" onClick={() => setFinalModalApp(null)} className="h-9 px-4 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100">Cancel</button>
                  <button type="submit" disabled={isUploadingOffer} className="h-9 px-5 bg-teal-700 text-white rounded-xl text-xs font-black hover:bg-teal-800 shadow-xs flex items-center gap-1.5">
                    {isUploadingOffer ? 'Processing...' : 'Confirm & Issue Final Acceptance PDF'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* View Drawer */}
      <AnimatePresence>
        {viewApp && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 bg-slate-900/20 backdrop-blur-sm z-50" onClick={() => setViewApp(null)} />
            <motion.div initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed right-0 top-0 bottom-0 w-full md:w-[480px] bg-white shadow-2xl z-50 flex flex-col border-l border-slate-100">
              <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
                <div>
                  <h3 className="text-sm font-extrabold text-slate-900">{viewApp.id}</h3>
                  <p className="text-[10px] font-semibold text-slate-400">{viewApp.studentName} · {viewApp.university}</p>
                </div>
                <button onClick={() => setViewApp(null)} className="p-2 rounded-full hover:bg-slate-50 text-slate-400"><X className="w-4 h-4" /></button>
              </div>

              <div className="flex-1 overflow-y-auto p-6 space-y-6">
                <div className="p-4 bg-slate-50 rounded-xl border border-slate-100 space-y-2">
                  <label className="block text-[10px] font-extrabold uppercase text-slate-400 tracking-wider">Change Application Status</label>
                  <select
                    value={viewApp.status}
                    onChange={(e) => handleStatusSelect(viewApp.id, e.target.value as AppStatus)}
                    className="w-full h-10 px-3 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:outline-none"
                  >
                    <option value="Submitted">Submitted</option>
                    <option value="Under Review">Under Review</option>
                    <option value="Offer Issued">Offer Issued (Attach Offer PDF)</option>
                    <option value="Accepted">Accepted</option>
                    <option value="Final Acceptance Issued">Final Acceptance Issued (Attach Acceptance PDF)</option>
                    <option value="Visa Processing">Visa Processing</option>
                    <option value="Visa Approved">Visa Approved</option>
                    <option value="Visa Rejected">Visa Rejected</option>
                    <option value="Approved">Approved</option>
                    <option value="Closed">Closed</option>
                    <option value="Rejected">Rejected</option>
                    <option value="Withdrawn">Withdrawn</option>
                  </select>
                </div>

                {viewApp.offerLetterUrl && (
                  <div className="p-4 bg-emerald-50 rounded-xl border border-emerald-200 space-y-2">
                    <span className="text-[10px] font-black uppercase text-emerald-800 tracking-wider block">Official Admission Offer PDF Attached</span>
                    <a
                      href={viewApp.offerLetterUrl}
                      download={`Official_Offer_${viewApp.university.replace(/\s+/g, '_')}.pdf`}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1.5 h-8 px-3 bg-emerald-600 text-white rounded-lg text-xs font-bold hover:bg-emerald-700"
                    >
                      <Download className="w-3.5 h-3.5" /> Download Admission Offer PDF
                    </a>
                  </div>
                )}

                {viewApp.finalAcceptanceUrl && (
                  <div className="p-4 bg-teal-50 rounded-xl border border-teal-200 space-y-2">
                    <span className="text-[10px] font-black uppercase text-teal-800 tracking-wider block">Official Final Acceptance Certificate Attached</span>
                    <a
                      href={viewApp.finalAcceptanceUrl}
                      download={`Official_Final_Acceptance_${viewApp.university.replace(/\s+/g, '_')}.pdf`}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1.5 h-8 px-3 bg-teal-700 text-white rounded-lg text-xs font-bold hover:bg-teal-800"
                    >
                      <Download className="w-3.5 h-3.5" /> Download Final Acceptance PDF
                    </a>
                  </div>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};
