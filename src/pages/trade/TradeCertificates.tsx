import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Award, Search, Download, Eye, ShieldCheck, CheckCircle2, X } from 'lucide-react';
import { Card } from '../../components/Card';
import { Button } from '../../components/Button';

export const TradeCertificates: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCert, setSelectedCert] = useState<any>(null);
  const [toast, setToast] = useState('');

  const [certs] = useState([
    {
      id: 'CRT-2026-901',
      title: 'EU Certificate of Origin (Form A)',
      authority: 'Chamber of Commerce Warsaw',
      country: 'Poland 🇵🇱',
      issueDate: 'Jul 10, 2026',
      expiryDate: 'Jul 10, 2027',
      status: 'Verified & Active',
      statusBadge: 'bg-emerald-50 text-emerald-700 border-emerald-200'
    },
    {
      id: 'CRT-2026-902',
      title: 'Phytosanitary Export Inspection Certificate',
      authority: 'Federal Ministry of Agriculture Berlin',
      country: 'Germany 🇩🇪',
      issueDate: 'Jul 22, 2026',
      expiryDate: 'Jan 22, 2027',
      status: 'Verified & Active',
      statusBadge: 'bg-emerald-50 text-emerald-700 border-emerald-200'
    },
    {
      id: 'CRT-2026-903',
      title: 'ISO 9001:2025 International Quality Certificate',
      authority: 'TÜV Rheinland International',
      country: 'Germany 🇩🇪',
      issueDate: 'Jan 15, 2026',
      expiryDate: 'Jan 15, 2029',
      status: 'Audit Passed',
      statusBadge: 'bg-blue-50 text-blue-700 border-blue-200'
    }
  ]);

  const showToastMsg = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(''), 3000);
  };

  const filteredCerts = certs.filter(c =>
    c.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.authority.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6 text-left antialiased">
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
            <Award className="w-5 h-5 text-[#6A1B2E]" /> Trade Certificates & Compliance Vault
          </h1>
          <p className="text-xs font-semibold text-slate-500 mt-1">
            Official Certificates of Origin, EUR.1 movement forms, Phytosanitary clearances, and ISO certifications.
          </p>
        </div>
      </div>

      <Card className="p-4 border border-slate-200/70 shadow-xs flex flex-col sm:flex-row gap-3 items-center justify-between">
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Search Certificate title or ID..." className="w-full h-9 pl-9 pr-4 bg-slate-100/70 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:bg-white focus:outline-none focus:border-[#6A1B2E]" />
        </div>
        <span className="text-xs font-bold text-slate-400">{filteredCerts.length} Certificates Verified</span>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {filteredCerts.map((c) => (
          <Card key={c.id} className="p-5 border border-slate-200/70 shadow-xs flex flex-col justify-between space-y-4 hover:border-slate-300 transition-all">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-black text-slate-400 uppercase">{c.id} · {c.country}</span>
                <span className={`px-2 py-0.5 rounded-full text-[9px] font-extrabold border ${c.statusBadge}`}>{c.status}</span>
              </div>
              <h3 className="text-sm font-black text-slate-900 leading-snug">{c.title}</h3>
              <p className="text-xs font-semibold text-slate-500">{c.authority}</p>
              <div className="text-[10.5px] font-bold text-slate-400 pt-1">
                Issue Date: {c.issueDate} · Valid till {c.expiryDate}
              </div>
            </div>

            <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
              <button onClick={() => setSelectedCert(c)} className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100" title="Inspect Certificate">
                <Eye className="w-4 h-4" />
              </button>
              <Button size="sm" variant="outline" className="text-xs font-bold" onClick={() => showToastMsg(`Downloading PDF for ${c.id}...`)}>
                <Download className="w-3.5 h-3.5 mr-1" /> PDF
              </Button>
            </div>
          </Card>
        ))}
      </div>

      {/* Drawer */}
      <AnimatePresence>
        {selectedCert && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 0.4 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-slate-900 z-40" onClick={() => setSelectedCert(null)} />
            <motion.div initial={{ translateX: '100%' }} animate={{ translateX: 0 }} exit={{ translateX: '100%' }} transition={{ duration: 0.25 }} className="fixed top-0 right-0 h-screen w-full max-w-md bg-white z-50 shadow-2xl p-6 overflow-y-auto">
              <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-5">
                <h3 className="text-sm font-black text-slate-900">Trade Certificate Verifier</h3>
                <button onClick={() => setSelectedCert(null)} className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg"><X className="w-4 h-4" /></button>
              </div>

              <div className="space-y-4 text-left">
                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 space-y-1">
                  <span className="text-[10px] font-black text-[#6A1B2E] uppercase">{selectedCert.id}</span>
                  <h4 className="text-base font-black text-slate-900">{selectedCert.title}</h4>
                  <p className="text-xs font-semibold text-slate-500">{selectedCert.authority}</p>
                </div>

                <div className="p-4 bg-slate-50 rounded-xl space-y-1">
                  <span className="text-[10px] font-extrabold uppercase text-slate-400">Validity Period</span>
                  <div className="text-xs font-black text-slate-900">Issued: {selectedCert.issueDate}</div>
                  <div className="text-xs font-black text-slate-900">Expires: {selectedCert.expiryDate}</div>
                </div>

                <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200 flex items-center gap-2 text-xs font-extrabold text-emerald-800">
                  <ShieldCheck className="w-5 h-5 text-emerald-600 shrink-0" />
                  Official Digital Stamp Verified by EU Trade Customs
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};
