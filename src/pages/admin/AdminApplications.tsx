import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Eye, CheckCircle2, XCircle, X } from 'lucide-react';

type AppStatus = 'Submitted' | 'Under Review' | 'Offer Received' | 'Rejected' | 'Visa Processing';

interface Application {
  id: string; studentId: string; studentName: string; flag: string;
  university: string; country: string; course: string; intake: string;
  status: AppStatus; date: string; counselor: string;
}

const APPS: Application[] = [
  { id: 'APP-001', studentId: 'FX-2026-001', studentName: 'Ashly', flag: '🇮🇳', university: 'University of Warsaw', country: 'Poland', course: 'M.Sc. Computer Science', intake: 'Feb 2026', status: 'Offer Received', date: 'Nov 15, 2025', counselor: 'Education Team' },
  { id: 'APP-002', studentId: 'FX-2026-002', studentName: 'Rahul Mehta', flag: '🇮🇳', university: 'TU Berlin', country: 'Germany', course: 'M.Sc. Data Engineering', intake: 'Oct 2026', status: 'Under Review', date: 'Dec 5, 2025', counselor: 'Riya Shah' },
  { id: 'APP-003', studentId: 'FX-2026-003', studentName: 'Priya Sharma', flag: '🇮🇳', university: 'University of Amsterdam', country: 'Netherlands', course: 'M.A. Business Analytics', intake: 'Sep 2026', status: 'Submitted', date: 'Jan 3, 2026', counselor: 'Arjun Pillai' },
  { id: 'APP-004', studentId: 'FX-2026-004', studentName: 'Amir Hassan', flag: '🇦🇪', university: 'Leiden University', country: 'Netherlands', course: 'LL.M. International Law', intake: 'Feb 2026', status: 'Visa Processing', date: 'Oct 22, 2025', counselor: 'Education Team' },
  { id: 'APP-005', studentId: 'FX-2026-005', studentName: 'Fatima Al-Rashid', flag: '🇶🇦', university: 'University of Gdansk', country: 'Poland', course: 'M.Sc. Marine Biology', intake: 'Feb 2026', status: 'Offer Received', date: 'Nov 30, 2025', counselor: 'Riya Shah' },
  { id: 'APP-006', studentId: 'FX-2026-006', studentName: 'Carlos Rivera', flag: '🇲🇽', university: 'Jagiellonian University', country: 'Poland', course: 'M.Sc. Biotechnology', intake: 'Oct 2026', status: 'Submitted', date: 'Jan 15, 2026', counselor: 'Arjun Pillai' },
  { id: 'APP-007', studentId: 'FX-2026-007', studentName: 'Nadia Kowalski', flag: '🇵🇱', university: 'Warsaw University of Technology', country: 'Poland', course: 'M.Sc. Civil Engineering', intake: 'Feb 2026', status: 'Offer Received', date: 'Sep 8, 2025', counselor: 'Education Team' },
  { id: 'APP-008', studentId: 'FX-2026-008', studentName: 'Yusuf Al-Farsi', flag: '🇴🇲', university: 'University of Wroclaw', country: 'Poland', course: 'M.B.A. Global Management', intake: 'Sep 2026', status: 'Under Review', date: 'Feb 1, 2026', counselor: 'Riya Shah' },
];

const STATUS_COLORS: Record<AppStatus, string> = {
  'Submitted': 'bg-slate-50 text-slate-600 border-slate-200',
  'Under Review': 'bg-blue-50 text-blue-700 border-blue-100',
  'Offer Received': 'bg-emerald-50 text-emerald-700 border-emerald-100',
  'Rejected': 'bg-red-50 text-red-700 border-red-100',
  'Visa Processing': 'bg-violet-50 text-violet-700 border-violet-100',
};

const TIMELINE_STEPS = ['Application Submitted', 'Documents Verified', 'University Review', 'Offer Issued', 'Visa Filed', 'Visa Decision'];

export const AdminApplications: React.FC = () => {
  const [apps, setApps] = useState(APPS);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [viewApp, setViewApp] = useState<Application | null>(null);
  const [toast, setToast] = useState('');
  const [confirmedSteps, setConfirmedSteps] = useState<Record<string, number>>({});

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(''), 2500); };

  const filtered = apps.filter(a =>
    (statusFilter === 'All' || a.status === statusFilter) &&
    (a.studentName.toLowerCase().includes(search.toLowerCase()) || a.university.toLowerCase().includes(search.toLowerCase()) || a.id.toLowerCase().includes(search.toLowerCase()))
  );

  const handleApprove = (id: string) => {
    setApps(prev => prev.map(a => a.id === id ? { ...a, status: 'Offer Received' as AppStatus } : a));
    setViewApp(null);
    showToast('Application approved — offer letter issued.');
  };

  const handleReject = (id: string) => {
    setApps(prev => prev.map(a => a.id === id ? { ...a, status: 'Rejected' as AppStatus } : a));
    setViewApp(null);
    showToast('Application rejected and student notified.');
  };

  const handleConfirmStep = (appId: string, stepIdx: number) => {
    setConfirmedSteps(prev => ({ ...prev, [appId]: stepIdx + 1 }));
    showToast(`Step "${TIMELINE_STEPS[stepIdx]}" confirmed!`);
  };

  const getConfirmedCount = (appId: string) => confirmedSteps[appId] ?? 0;

  const statusCounts = ['All', 'Submitted', 'Under Review', 'Offer Received', 'Visa Processing', 'Rejected'].map(s => ({
    label: s, count: s === 'All' ? apps.length : apps.filter(a => a.status === s).length
  }));

  return (
    <div className="space-y-5 relative">
      {toast && (
        <div className="fixed top-6 right-6 z-50 bg-slate-900 text-white px-5 py-3.5 rounded-xl shadow-2xl text-sm font-bold flex items-center gap-3">
          <CheckCircle2 className="w-5 h-5 text-emerald-400" /> {toast}
        </div>
      )}

      <div>
        <h1 className="text-xl font-extrabold text-slate-900">Applications</h1>
        <p className="text-xs font-semibold text-slate-400 mt-0.5">Manage and review all student applications</p>
      </div>

      {/* Status filter pills */}
      <div className="flex items-center gap-2 flex-wrap">
        {statusCounts.map(({ label, count }) => (
          <button key={label} onClick={() => setStatusFilter(label)}
            className={`flex items-center gap-1.5 h-8 px-3 rounded-xl text-[10px] font-extrabold border transition-all
              ${statusFilter === label ? 'bg-[#6A1B2E] text-white border-[#6A1B2E]' : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50'}`}>
            {label}
            <span className={`rounded-full px-1.5 py-0.5 text-[9px] font-extrabold ${statusFilter === label ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-500'}`}>{count}</span>
          </button>
        ))}
        <div className="ml-auto relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
          <input value={search} onChange={(e) => setSearch(e.target.value)}
            placeholder="Search applications..."
            className="h-9 pl-8 pr-3 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 placeholder-slate-300 focus:outline-none focus:border-[#6A1B2E]/40 w-52" />
        </div>
      </div>

      {/* Table */}
      <div className="bg-white border border-slate-100 rounded-2xl shadow-sm overflow-hidden">
        <table className="w-full text-xs min-w-[750px]">
          <thead>
            <tr className="border-b border-slate-50 bg-slate-50/50">
              {['Student', 'Application ID', 'University', 'Course', 'Status', 'Date', 'Actions'].map(h => (
                <th key={h} className="text-left px-5 py-3 text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map((a) => (
              <tr key={a.id} className="border-b border-slate-50 last:border-0 hover:bg-slate-50/40 transition-colors">
                <td className="px-5 py-4">
                  <div className="flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-lg bg-[#6A1B2E] flex items-center justify-center text-white text-[9px] font-extrabold shrink-0">
                      {a.studentName.split(' ').map(n => n[0]).join('')}
                    </div>
                    <div>
                      <p className="font-extrabold text-slate-900">{a.studentName}</p>
                      <p className="text-[10px] text-slate-400 font-semibold">{a.flag} {a.studentId}</p>
                    </div>
                  </div>
                </td>
                <td className="px-5 py-4 font-bold text-slate-600">{a.id}</td>
                <td className="px-5 py-4">
                  <p className="font-bold text-slate-800 max-w-[160px] truncate">{a.university}</p>
                  <p className="text-[10px] text-slate-400 font-semibold">{a.country}</p>
                </td>
                <td className="px-5 py-4 text-slate-600 font-semibold max-w-[140px] truncate">{a.course}</td>
                <td className="px-5 py-4">
                  <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold border ${STATUS_COLORS[a.status]}`}>{a.status}</span>
                </td>
                <td className="px-5 py-4 text-slate-500 font-semibold">{a.date}</td>
                <td className="px-5 py-4">
                  <div className="flex items-center gap-1.5">
                    <button onClick={() => setViewApp(a)} className="p-1.5 rounded-lg text-slate-500 hover:text-blue-600 hover:bg-blue-50 transition-all" title="View">
                      <Eye className="w-3.5 h-3.5" />
                    </button>
                    <button onClick={() => handleApprove(a.id)} className="p-1.5 rounded-lg text-slate-500 hover:text-emerald-600 hover:bg-emerald-50 transition-all" title="Approve">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                    </button>
                    <button onClick={() => handleReject(a.id)} className="p-1.5 rounded-lg text-slate-500 hover:text-red-600 hover:bg-red-50 transition-all" title="Reject">
                      <XCircle className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr><td colSpan={7} className="py-12 text-center text-sm font-semibold text-slate-400">No applications match your search.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {/* View Drawer with One-Click Process Confirmation Timeline */}
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
                {/* Status */}
                <div className="flex items-center gap-3">
                  <span className={`inline-flex px-3 py-1 rounded-full text-xs font-bold border ${STATUS_COLORS[viewApp.status]}`}>{viewApp.status}</span>
                  <span className="text-xs font-semibold text-slate-500">Counselor: {viewApp.counselor}</span>
                </div>

                {/* Details */}
                <div className="space-y-2">
                  {[
                    { label: 'Student', value: `${viewApp.flag} ${viewApp.studentName}` },
                    { label: 'University', value: viewApp.university },
                    { label: 'Country', value: viewApp.country },
                    { label: 'Course', value: viewApp.course },
                    { label: 'Intake', value: viewApp.intake },
                    { label: 'Submitted', value: viewApp.date },
                  ].map(({ label, value }) => (
                    <div key={label} className="flex justify-between items-center py-1.5 border-b border-slate-50">
                      <span className="text-[10px] font-extrabold text-slate-400 uppercase">{label}</span>
                      <span className="text-xs font-bold text-slate-800">{value}</span>
                    </div>
                  ))}
                </div>

                {/* ── One-Click Process Confirmation Timeline ── */}
                <div>
                  <h4 className="text-xs font-extrabold text-slate-900 mb-4">Process Confirmation Timeline</h4>
                  <div className="space-y-0">
                    {TIMELINE_STEPS.map((step, idx) => {
                      const confirmed = idx < getConfirmedCount(viewApp.id);
                      const isNext = idx === getConfirmedCount(viewApp.id);
                      return (
                        <div key={step} className="flex gap-3">
                          <div className="flex flex-col items-center">
                            <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 transition-all ${confirmed ? 'bg-emerald-500' : isNext ? 'bg-[#6A1B2E] ring-4 ring-[#6A1B2E]/10' : 'bg-slate-100'}`}>
                              {confirmed
                                ? <CheckCircle2 className="w-4 h-4 text-white" />
                                : <span className={`w-2.5 h-2.5 rounded-full ${isNext ? 'bg-white' : 'bg-slate-300'}`} />}
                            </div>
                            {idx < TIMELINE_STEPS.length - 1 && (
                              <div className={`w-0.5 h-9 transition-colors ${confirmed ? 'bg-emerald-200' : 'bg-slate-100'}`} />
                            )}
                          </div>
                          <div className="pb-5 flex items-start justify-between flex-1 gap-2">
                            <div>
                              <p className={`text-xs font-bold ${confirmed ? 'text-emerald-700' : isNext ? 'text-slate-900' : 'text-slate-400'}`}>{step}</p>
                              {confirmed && <p className="text-[10px] font-semibold text-emerald-500 mt-0.5">✓ Confirmed</p>}
                            </div>
                            {isNext && (
                              <motion.button
                                whileTap={{ scale: 0.95 }}
                                onClick={() => handleConfirmStep(viewApp.id, idx)}
                                className="shrink-0 h-7 px-3 bg-[#6A1B2E] text-white text-[10px] font-extrabold rounded-lg hover:bg-[#4A101E] transition-all"
                              >
                                Confirm →
                              </motion.button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              <div className="p-4 border-t border-slate-100 flex gap-3">
                <button onClick={() => handleReject(viewApp.id)} className="flex-1 h-10 border border-red-200 text-xs font-bold text-red-600 rounded-xl hover:bg-red-50 transition-all flex items-center justify-center gap-1.5">
                  <XCircle className="w-4 h-4" /> Reject
                </button>
                <button onClick={() => handleApprove(viewApp.id)} className="flex-1 h-10 bg-emerald-600 text-white text-xs font-bold rounded-xl hover:bg-emerald-700 transition-all flex items-center justify-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4" /> Approve
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};
