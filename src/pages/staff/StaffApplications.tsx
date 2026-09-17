import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  GraduationCap, Search, CheckCircle2, AlertCircle, RotateCcw,
  Calendar, Building2, User, FileText, ChevronRight, X, ShieldCheck
} from 'lucide-react';
import { Card } from '../../components/Card';
import { Button } from '../../components/Button';
import { getApplications, updateApplicationStatus } from '../../lib/api/applications';
import type { Application } from '../../lib/types';

const STATUS_TABS = [
  'All',
  'Submitted',
  'Under Review',
  'Conditional Offer',
  'Unconditional Offer',
  'Accepted',
  'Visa In Progress',
  'Enrolled',
  'Rejected',
] as const;

export const StaffApplications: React.FC = () => {
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState('');
  const [activeTab, setActiveTab] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedApp, setSelectedApp] = useState<Application | null>(null);
  const [newStatus, setNewStatus] = useState<Application['status']>('Under Review');
  const [statusNotes, setStatusNotes] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(''), 3500);
  };

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getApplications();
      setApplications(data || []);
    } catch (err: any) {
      setError(err.message || 'Failed to load applications from database');
      setApplications([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    window.addEventListener('ferex_application_change', loadData);
    return () => {
      window.removeEventListener('ferex_application_change', loadData);
    };
  }, []);

  const filteredApps = useMemo(() => {
    return applications.filter(app => {
      const currentStatus = (app.status || 'Submitted').toLowerCase();
      const tabLower = activeTab.toLowerCase();

      const matchesTab =
        activeTab === 'All' ||
        currentStatus === tabLower ||
        currentStatus.includes(tabLower);

      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        (app.student_name || '').toLowerCase().includes(q) ||
        (app.university_name || '').toLowerCase().includes(q) ||
        (app.program_name || '').toLowerCase().includes(q) ||
        (app.course || '').toLowerCase().includes(q) ||
        app.id.toLowerCase().includes(q);

      return matchesTab && matchesSearch;
    });
  }, [applications, activeTab, searchQuery]);

  const handleUpdateStatus = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedApp) return;

    try {
      setIsUpdating(true);
      await updateApplicationStatus(selectedApp.id, newStatus, statusNotes || undefined);
      showToast(`Application #${selectedApp.id.slice(0, 8)} status updated to ${newStatus}!`);
      setSelectedApp(null);
      setStatusNotes('');
      await loadData();
    } catch (err: any) {
      showToast(`Error updating status: ${err.message || 'Failed'}`);
    } finally {
      setIsUpdating(false);
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
              <ShieldCheck className="w-3 h-3 text-[#58051E]" /> ADMISSIONS & ENROLLMENT
            </span>
            <span className="text-[10px] font-bold text-slate-400">● Realtime Supabase Data</span>
          </div>
          <h1 className="text-2xl font-black text-slate-900 mt-1 flex items-center gap-2">
            <GraduationCap className="w-6 h-6 text-[#58051E]" /> Applications & Admissions
          </h1>
          <p className="text-xs font-semibold text-slate-500 mt-0.5">
            Manage student university submissions, review admission stages, issue conditional/unconditional offers, and track enrollment.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Button
            size="sm"
            variant="outline"
            onClick={loadData}
            disabled={loading}
            className="text-xs font-bold border-slate-200 text-slate-700 hover:bg-slate-50"
          >
            <RotateCcw className={`w-3.5 h-3.5 mr-1.5 ${loading ? 'animate-spin text-[#58051E]' : ''}`} />
            Refresh Applications
          </Button>
        </div>
      </div>

      {/* Search & Tabs Toolbar */}
      <Card className="p-4 border border-slate-200/80 shadow-xs space-y-3">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
          {/* Status Tabs */}
          <div className="flex items-center gap-1.5 w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0">
            {STATUS_TABS.map(tab => (
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
              placeholder="Search by student, university, course..."
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
            onClick={loadData}
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
      {!loading && !error && filteredApps.length === 0 && (
        <Card className="p-12 border border-slate-200/80 shadow-xs text-center space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
            <GraduationCap className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-base font-black text-slate-800">No applications found</h3>
            <p className="text-xs font-semibold text-slate-400 mt-1 max-w-sm mx-auto leading-relaxed">
              {applications.length === 0
                ? 'There are currently zero applications submitted in the database. When students apply to universities, their dossiers will appear here.'
                : 'No applications match your active search and status filter.'}
            </p>
          </div>
        </Card>
      )}

      {/* Real Applications Table */}
      {!loading && !error && filteredApps.length > 0 && (
        <Card className="border border-slate-200/80 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200/80 text-[10px] font-black uppercase text-slate-400 tracking-wider">
                  <th className="py-3 px-4">Student Candidate</th>
                  <th className="py-3 px-4">Target University</th>
                  <th className="py-3 px-4">Program / Course</th>
                  <th className="py-3 px-4">Intake</th>
                  <th className="py-3 px-4">Current Stage</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs font-semibold text-slate-700">
                {filteredApps.map(app => {
                  const statusStr = app.status || 'Submitted';
                  const isOffer = statusStr.toLowerCase().includes('offer');
                  const isEnrolled = statusStr.toLowerCase().includes('enroll');
                  const isRejected = statusStr.toLowerCase().includes('reject');

                  return (
                    <tr key={app.id} className="hover:bg-slate-50/70 transition-all">
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-lg bg-[#58051E]/10 text-[#58051E] font-black flex items-center justify-center text-xs shrink-0">
                            {(app.student_name || 'ST').slice(0, 2).toUpperCase()}
                          </div>
                          <div>
                            <span className="font-extrabold text-slate-900 block leading-tight">
                              {app.student_name || 'Student Candidate'}
                            </span>
                            <span className="text-[10px] text-slate-400 font-medium block mt-0.5">
                              App ID: {app.id.slice(0, 8)}
                            </span>
                          </div>
                        </div>
                      </td>
                      <td className="py-3.5 px-4 font-bold text-slate-800">
                        {app.university_name || 'Partner Institution'}
                      </td>
                      <td className="py-3.5 px-4 text-slate-600">
                        {app.program_name || app.course || 'Degree Program'}
                      </td>
                      <td className="py-3.5 px-4 text-slate-600">
                        {app.intake || '2026 Intake'}
                      </td>
                      <td className="py-3.5 px-4">
                        <span
                          className={`px-2.5 py-0.5 rounded text-[10px] font-black border ${
                            isEnrolled
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                              : isOffer
                              ? 'bg-purple-50 text-purple-700 border-purple-200'
                              : isRejected
                              ? 'bg-red-50 text-red-700 border-red-200'
                              : 'bg-blue-50 text-blue-700 border-blue-200'
                          }`}
                        >
                          {statusStr}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setSelectedApp(app);
                            setNewStatus(app.status || 'Under Review');
                            setStatusNotes(app.notes || '');
                          }}
                          className="text-xs font-bold text-[#58051E] border-[#58051E]/30 hover:bg-[#58051E]/5"
                        >
                          Review & Update Stage
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Review & Update Stage Modal */}
      <AnimatePresence>
        {selectedApp && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.5 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-slate-900 z-50"
              onClick={() => setSelectedApp(null)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-full max-w-lg bg-white rounded-3xl p-6 shadow-2xl space-y-4 text-left"
            >
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div>
                  <h3 className="text-base font-black text-slate-900">
                    Update Application Stage
                  </h3>
                  <span className="text-[10px] font-semibold text-slate-400">
                    Application ID: {selectedApp.id}
                  </span>
                </div>
                <button
                  onClick={() => setSelectedApp(null)}
                  className="p-1 rounded-lg text-slate-400 hover:text-slate-600 cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200/80 space-y-1 text-xs">
                <div>
                  <span className="text-slate-400 font-bold">Student:</span>{' '}
                  <strong className="text-slate-900">{selectedApp.student_name}</strong>
                </div>
                <div>
                  <span className="text-slate-400 font-bold">University:</span>{' '}
                  <strong className="text-slate-900">{selectedApp.university_name}</strong>
                </div>
                <div>
                  <span className="text-slate-400 font-bold">Program:</span>{' '}
                  <strong className="text-slate-900">{selectedApp.program_name || selectedApp.course}</strong>
                </div>
                <div>
                  <span className="text-slate-400 font-bold">Intake:</span>{' '}
                  <strong className="text-slate-900">{selectedApp.intake}</strong>
                </div>
              </div>

              <form onSubmit={handleUpdateStatus} className="space-y-4">
                <div>
                  <label className="block text-[10px] font-black uppercase text-slate-400 mb-1">
                    Admissions Stage
                  </label>
                  <select
                    value={newStatus}
                    onChange={e => setNewStatus(e.target.value as any)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:ring-1 focus:ring-[#58051E]"
                  >
                    <option value="Submitted">Submitted</option>
                    <option value="Under Review">Under Review</option>
                    <option value="Conditional Offer">Conditional Offer Issued</option>
                    <option value="Unconditional Offer">Unconditional Offer Issued</option>
                    <option value="Accepted">Accepted by Student</option>
                    <option value="Visa In Progress">Visa Processing</option>
                    <option value="Enrolled">Officially Enrolled</option>
                    <option value="Rejected">Application Rejected</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-black uppercase text-slate-400 mb-1">
                    Admissions Counselor Advisory Notes
                  </label>
                  <textarea
                    value={statusNotes}
                    onChange={e => setStatusNotes(e.target.value)}
                    placeholder="Enter counselor notes regarding offer conditions, CAS requirements, or follow-ups..."
                    rows={3}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:outline-none focus:ring-1 focus:ring-[#58051E]"
                  />
                </div>

                <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setSelectedApp(null)}
                    className="text-xs font-bold"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    size="sm"
                    disabled={isUpdating}
                    className="bg-[#58051E] hover:bg-[#430316] text-white font-black text-xs"
                  >
                    {isUpdating ? 'Updating in Supabase...' : 'Save Application Stage'}
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
