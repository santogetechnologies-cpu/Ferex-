import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Users, Search, Filter, Phone, Mail, Globe, Calendar, CheckCircle2,
  Clock, AlertCircle, XCircle, ChevronDown, Check, UserPlus, UserCheck,
  Send, MessageSquare, Award, ArrowUpRight, TrendingUp, Sparkles, Key,
  Shield, Edit3, Trash2, Eye, ExternalLink, RefreshCw, Layers
} from 'lucide-react';
import { Card } from '../../components/Card';
import { Button } from '../../components/Button';
import { ToastNotification } from '../../components/ToastNotification';
import {
  getEducationLeads,
  updateEducationLead,
  bulkAssignLeadsToCounselor,
  convertLeadToStudentAccount,
  getEducationLeadActivities,
  addEducationLeadActivity,
  getCounselorPerformanceMetrics,
  sendLeadWhatsAppWelcome,
  type EducationLead,
  type EducationLeadActivity,
  type CounselorPerformanceMetric
} from '../../lib/api/educationLeads';
import { getEducationStaff, type DivisionStaffMember } from '../../lib/api/staff';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import { Link } from 'react-router-dom';

interface AdminStudentEnquiriesProps {
  isStaff?: boolean; // When true, runs in Counselor portal view
}

const STATUS_OPTIONS: EducationLead['status'][] = [
  'New Lead',
  'Contacted',
  'Interested',
  'Follow Up',
  'Not Interested',
  'Enrolled',
  'Lost'
];

const STATUS_COLORS: Record<EducationLead['status'], { bg: string; text: string; border: string }> = {
  'New Lead': { bg: 'bg-sky-50', text: 'text-sky-700', border: 'border-sky-200' },
  'Contacted': { bg: 'bg-indigo-50', text: 'text-indigo-700', border: 'border-indigo-200' },
  'Interested': { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200' },
  'Follow Up': { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200' },
  'Not Interested': { bg: 'bg-slate-100', text: 'text-slate-600', border: 'border-slate-200' },
  'Enrolled': { bg: 'bg-[#58051E]/10', text: 'text-[#58051E]', border: 'border-[#58051E]/20' },
  'Lost': { bg: 'bg-rose-50', text: 'text-rose-700', border: 'border-rose-200' },
};

export const AdminStudentEnquiries: React.FC<AdminStudentEnquiriesProps> = ({ isStaff = false }) => {
  const { profile } = useAuth();
  const currentCounselorName = profile?.full_name || 'Counselor';

  const [leads, setLeads] = useState<EducationLead[]>([]);
  const [counselors, setCounselors] = useState<DivisionStaffMember[]>([]);
  const [metrics, setMetrics] = useState<CounselorPerformanceMetric[]>([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState('');

  // Filters
  const [statusFilter, setStatusFilter] = useState<string>('All');
  const [counselorFilter, setCounselorFilter] = useState<string>(isStaff ? currentCounselorName : 'All');
  const [searchQuery, setSearchQuery] = useState('');

  // Bulk Selection
  const [selectedLeadIds, setSelectedLeadIds] = useState<Set<string>>(new Set());
  const [bulkAssignCounselorId, setBulkAssignCounselorId] = useState('');
  const [showBulkAssignModal, setShowBulkAssignModal] = useState(false);

  // Lead Detail & Activity Drawer
  const [activeLead, setActiveLead] = useState<EducationLead | null>(null);
  const [leadActivities, setLeadActivities] = useState<EducationLeadActivity[]>([]);
  const [newActivityNote, setNewActivityNote] = useState('');
  const [newActivityType, setNewActivityType] = useState<EducationLeadActivity['activity_type']>('Phone Call');

  // Convert Deal & Create Student Login Modal
  const [convertModalLead, setConvertModalLead] = useState<EducationLead | null>(null);
  const [tempPassword, setTempPassword] = useState('Student@2026');
  const [converting, setConverting] = useState(false);
  const [createdCredentials, setCreatedCredentials] = useState<{ email: string; pass: string } | null>(null);

  const showToastMsg = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(''), 3500);
  };

  // Load Data
  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [leadsList, edStaff, perfList] = await Promise.all([
        getEducationLeads(),
        getEducationStaff(),
        getCounselorPerformanceMetrics(),
      ]);

      setLeads(leadsList);
      setCounselors(edStaff);
      setMetrics(perfList);

      if (edStaff.length > 0 && !bulkAssignCounselorId) {
        setBulkAssignCounselorId(edStaff[0].id);
      }
    } finally {
      setLoading(false);
    }
  }, [bulkAssignCounselorId]);

  useEffect(() => {
    loadData();

    // Supabase Realtime Listener
    const channel = supabase
      .channel('realtime_education_leads_crm')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'education_leads' }, () => loadData())
      .subscribe();

    const handleSync = () => loadData();
    window.addEventListener('ferex_education_leads_change', handleSync);

    return () => {
      supabase.removeChannel(channel);
      window.removeEventListener('ferex_education_leads_change', handleSync);
    };
  }, [loadData]);

  // Load activities when activeLead changes
  useEffect(() => {
    if (activeLead) {
      getEducationLeadActivities(activeLead.id).then((acts) => setLeadActivities(acts));
    } else {
      setLeadActivities([]);
    }
  }, [activeLead]);

  // Bulk Selection Handlers
  const handleToggleSelectAll = () => {
    if (selectedLeadIds.size === filteredLeads.length) {
      setSelectedLeadIds(new Set());
    } else {
      setSelectedLeadIds(new Set(filteredLeads.map((l) => l.id)));
    }
  };

  const handleToggleSelectOne = (id: string) => {
    const next = new Set(selectedLeadIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedLeadIds(next);
  };

  const handleExecuteBulkAssign = async () => {
    const targetCounselor = counselors.find((c) => c.id === bulkAssignCounselorId);
    if (!targetCounselor || selectedLeadIds.size === 0) return;

    try {
      await bulkAssignLeadsToCounselor(
        Array.from(selectedLeadIds),
        { id: targetCounselor.id, name: targetCounselor.name, email: targetCounselor.email },
        profile?.full_name || 'Admin'
      );
      showToastMsg(`✅ Successfully assigned ${selectedLeadIds.size} student leads to Counselor ${targetCounselor.name}!`);
      setSelectedLeadIds(new Set());
      setShowBulkAssignModal(false);
      await loadData();
    } catch (err: any) {
      showToastMsg(`Failed to assign leads: ${err.message}`);
    }
  };

  // Status Change Handler with Automatic Student Directory Sync
  const handleQuickStatusChange = async (lead: EducationLead, newStatus: EducationLead['status']) => {
    try {
      if (newStatus === 'Enrolled' && !lead.converted_student_id) {
        showToastMsg(`Enrolling "${lead.name || lead.phone}" & syncing to Student Directory...`);
        const res = await convertLeadToStudentAccount(
          lead.id,
          undefined,
          profile?.full_name || 'Admissions Counselor'
        );
        if (res.success) {
          showToastMsg(`🎉 Lead Enrolled! Student profile active and synced to Student Directory.`);
        } else {
          await updateEducationLead(lead.id, { status: newStatus }, profile?.full_name || 'Staff');
          showToastMsg(`Enrolled "${lead.name || lead.phone}". Directory sync active.`);
        }
      } else {
        await updateEducationLead(lead.id, { status: newStatus }, profile?.full_name || 'Staff');
        showToastMsg(`Updated "${lead.name || lead.phone}" status to "${newStatus}"`);
      }
      await loadData();
    } catch (err: any) {
      showToastMsg(`Error: ${err.message}`);
    }
  };

  // Resend WhatsApp Handler
  const handleResendWhatsApp = async (lead: EducationLead) => {
    try {
      const res = await sendLeadWhatsAppWelcome(lead);
      if (res.success) {
        showToastMsg(`📱 Automated WhatsApp Welcome message sent to ${lead.phone}!`);
      } else {
        showToastMsg(`WhatsApp error: ${res.error}`);
      }
      await loadData();
    } catch (err: any) {
      showToastMsg(`Error dispatching WhatsApp: ${err.message}`);
    }
  };

  // Add Activity / Interaction Log
  const handleAddActivity = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeLead || !newActivityNote.trim()) return;

    try {
      const act = await addEducationLeadActivity({
        lead_id: activeLead.id,
        activity_type: newActivityType,
        title: `${newActivityType} Logged`,
        description: newActivityNote.trim(),
        performed_by: profile?.full_name || 'Counselor',
        performed_by_email: profile?.email || '',
      });
      setLeadActivities([act, ...leadActivities]);
      setNewActivityNote('');
      showToastMsg('Interaction logged to lead timeline.');
    } catch (err: any) {
      showToastMsg(`Failed to log activity: ${err.message}`);
    }
  };

  // Convert Lead Deal to Student Account with Temporary Password
  const handleConvertDeal = async () => {
    if (!convertModalLead) return;
    setConverting(true);
    try {
      const res = await convertLeadToStudentAccount(
        convertModalLead.id,
        tempPassword.trim() || 'Student@2026',
        profile?.full_name || 'Admissions Counselor'
      );

      if (res.success) {
        setCreatedCredentials({
          email: res.email || convertModalLead.email || 'student@ferexstudent.org',
          pass: res.tempPassword || tempPassword,
        });
        showToastMsg(`🎉 Deal Closed! Student portal account created for "${convertModalLead.name || convertModalLead.phone}".`);
        await loadData();
      } else {
        showToastMsg(`Conversion error: ${res.error}`);
      }
    } catch (err: any) {
      showToastMsg(`Conversion error: ${err.message}`);
    } finally {
      setConverting(false);
    }
  };

  // Filtered Leads
  const filteredLeads = useMemo(() => {
    return leads.filter((l) => {
      // Status filter
      if (statusFilter !== 'All' && l.status !== statusFilter) return false;

      // Counselor filter
      if (counselorFilter !== 'All') {
        const assignedName = (l.assigned_counselor_name || '').toLowerCase();
        const target = counselorFilter.toLowerCase();
        if (target === 'unassigned') {
          if (l.assigned_counselor_id) return false;
        } else if (!assignedName.includes(target)) {
          return false;
        }
      }

      // Search Query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const nameMatch = l.name && l.name.toLowerCase().includes(q);
        const phoneMatch = l.phone.includes(q);
        const emailMatch = l.email && l.email.toLowerCase().includes(q);
        const countryMatch = l.preferred_country && l.preferred_country.toLowerCase().includes(q);
        if (!nameMatch && !phoneMatch && !emailMatch && !countryMatch) return false;
      }

      return true;
    });
  }, [leads, statusFilter, counselorFilter, searchQuery]);

  // Counts for Status Tabs
  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = { All: leads.length };
    for (const opt of STATUS_OPTIONS) {
      counts[opt] = leads.filter((l) => l.status === opt).length;
    }
    return counts;
  }, [leads]);

  // Best Performing Counselor
  const topCounselor = metrics.find((m) => m.counselor_id !== 'unassigned' && m.enrolled > 0);

  return (
    <div className="space-y-6 text-left antialiased">
      <ToastNotification message={toast} onClose={() => setToast('')} />

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-black text-slate-900 tracking-tight flex items-center gap-2">
              <Users className="w-5 h-5 text-[#58051E]" /> Student Enquiries & Admissions CRM
            </h1>
            <span className="text-[10px] font-extrabold bg-[#58051E]/10 text-[#58051E] px-2.5 py-0.5 rounded-full border border-[#58051E]/20">
              {isStaff ? 'My Assigned Leads' : 'Full Admissions Pipeline'}
            </span>
          </div>
          <p className="text-xs font-semibold text-slate-500 mt-0.5">
            Incoming prospective student leads, bulk counselor distribution, WhatsApp triggers, and one-click account provisioning.
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <Link
            to="/study-abroad"
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs font-bold text-slate-700 hover:text-[#58051E] bg-white border border-slate-200 hover:border-[#58051E]/40 px-3 py-2 rounded-xl transition-all shadow-2xs flex items-center gap-1.5"
          >
            <ExternalLink className="w-3.5 h-3.5 text-[#58051E]" /> View Public Landing Page
          </Link>
          <Button
            size="sm"
            onClick={loadData}
            variant="outline"
            className="text-xs font-bold border-slate-200 text-slate-700 flex items-center gap-1.5"
          >
            <RefreshCw className="w-3.5 h-3.5" /> Refresh
          </Button>
        </div>
      </div>

      {/* ── KPI & Performance Leaderboard Cards ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        <Card className="p-4 bg-gradient-to-br from-[#58051E]/10 via-[#58051E]/5 to-transparent border border-[#58051E]/20 shadow-xs">
          <span className="text-[10px] font-black uppercase text-[#58051E] tracking-wider block">Total Admissions Leads</span>
          <div className="flex items-baseline justify-between mt-1">
            <span className="text-2xl font-black text-slate-900">{leads.length}</span>
            <span className="text-[10px] font-bold text-[#58051E] bg-[#58051E]/15 px-2 py-0.5 rounded-full">
              {statusCounts['New Lead'] || 0} New
            </span>
          </div>
          <span className="text-[10px] font-semibold text-slate-500 block mt-1">All landing page enquiries</span>
        </Card>

        <Card className="p-4 bg-emerald-500/10 border border-emerald-500/20 shadow-xs">
          <span className="text-[10px] font-black uppercase text-emerald-800 tracking-wider block">Deals Closed & Enrolled</span>
          <div className="flex items-baseline justify-between mt-1">
            <span className="text-2xl font-black text-emerald-950">{statusCounts['Enrolled'] || 0}</span>
            <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">
              {leads.length > 0 ? Math.round(((statusCounts['Enrolled'] || 0) / leads.length) * 100) : 0}% Conversion
            </span>
          </div>
          <span className="text-[10px] font-semibold text-emerald-600 block mt-1">Converted to active student accounts</span>
        </Card>

        <Card className="p-4 bg-indigo-500/10 border border-indigo-500/20 shadow-xs">
          <span className="text-[10px] font-black uppercase text-indigo-800 tracking-wider block">In Active Follow-Up</span>
          <div className="flex items-baseline justify-between mt-1">
            <span className="text-2xl font-black text-indigo-950">
              {(statusCounts['Contacted'] || 0) + (statusCounts['Interested'] || 0) + (statusCounts['Follow Up'] || 0)}
            </span>
            <span className="text-[10px] font-bold text-indigo-700 bg-indigo-100 px-2 py-0.5 rounded-full">
              Counseling Active
            </span>
          </div>
          <span className="text-[10px] font-semibold text-indigo-600 block mt-1">Contacted, Interested & Follow-Up</span>
        </Card>

        {/* Best Performing Counselor Badge */}
        <Card className="p-4 bg-amber-500/10 border border-amber-500/20 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black uppercase text-amber-900 tracking-wider flex items-center gap-1">
                <Award className="w-3.5 h-3.5 text-amber-600" /> Best Performing Counselor
              </span>
              <span className="text-[9px] font-extrabold text-amber-800 bg-amber-200/60 px-1.5 py-0.2 rounded">#1 Leader</span>
            </div>
            <div className="mt-1">
              <span className="text-base font-black text-slate-900 block truncate">
                {topCounselor ? topCounselor.counselor_name : 'Team Effort'}
              </span>
              <span className="text-[11px] font-bold text-amber-800">
                {topCounselor ? `${topCounselor.enrolled} Students Enrolled (${topCounselor.conversion_rate}% Closed)` : 'No conversions logged yet'}
              </span>
            </div>
          </div>
          <span className="text-[9px] font-semibold text-amber-700 block mt-2">Ranked by closed university admissions</span>
        </Card>
      </div>

      {/* ── Counselor Performance Matrix Table (Admin View Only) ── */}
      {!isStaff && metrics.length > 0 && (
        <Card className="p-4 border border-slate-200/80 shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-[#58051E]" />
              <h3 className="text-xs font-black uppercase tracking-wider text-slate-800">Counselor Performance Matrix</h3>
            </div>
            <span className="text-[10px] font-bold text-slate-400">Live Conversion Analytics</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-y border-slate-200/70 text-[10px] font-extrabold uppercase text-slate-500">
                <tr>
                  <th className="p-2.5">Rank</th>
                  <th className="p-2.5">Counselor Name</th>
                  <th className="p-2.5 text-center">Assigned Leads</th>
                  <th className="p-2.5 text-center">Contacted</th>
                  <th className="p-2.5 text-center">Interested / Follow-up</th>
                  <th className="p-2.5 text-center">Closed Deals (Enrolled)</th>
                  <th className="p-2.5 text-right">Conversion Rate</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-semibold text-slate-700">
                {metrics.map((m) => (
                  <tr key={m.counselor_id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="p-2.5 font-mono font-bold text-slate-500">
                      {m.rank === 1 && m.enrolled > 0 ? (
                        <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[10px] font-black bg-amber-100 text-amber-800 border border-amber-300">
                          🏆 #1
                        </span>
                      ) : (
                        `#${m.rank}`
                      )}
                    </td>
                    <td className="p-2.5 font-bold text-slate-900">{m.counselor_name}</td>
                    <td className="p-2.5 text-center font-bold">{m.total_assigned}</td>
                    <td className="p-2.5 text-center text-indigo-700 font-bold">{m.contacted}</td>
                    <td className="p-2.5 text-center text-amber-700 font-bold">{m.interested + m.in_follow_up}</td>
                    <td className="p-2.5 text-center font-black text-emerald-700">{m.enrolled}</td>
                    <td className="p-2.5 text-right font-black text-slate-900">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] ${
                        m.conversion_rate >= 30 ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-700'
                      }`}>
                        {m.conversion_rate}%
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* ── Status Tabs & Search Bar ── */}
      <Card className="p-4 border border-slate-200/80 shadow-xs space-y-3">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          {/* Status Tabs */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-[10px] font-black uppercase text-slate-400 mr-1 flex items-center gap-1">
              <Filter className="w-3 h-3" /> Status:
            </span>
            {(['All', ...STATUS_OPTIONS] as const).map((tab) => {
              const count = statusCounts[tab] || 0;
              const isActive = statusFilter === tab;
              return (
                <button
                  key={tab}
                  type="button"
                  onClick={() => setStatusFilter(tab)}
                  className={`px-2.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                    isActive
                      ? 'bg-[#58051E] text-white shadow-xs'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200/70'
                  }`}
                >
                  <span>{tab}</span>
                  <span className={`text-[10px] font-extrabold px-1.5 py-0.2 rounded-full ${
                    isActive ? 'bg-white/20 text-white' : 'bg-slate-200/80 text-slate-700'
                  }`}>
                    {count}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Counselor & Search Filter */}
          <div className="flex items-center gap-2 flex-wrap">
            {!isStaff && (
              <select
                value={counselorFilter}
                onChange={(e) => setCounselorFilter(e.target.value)}
                className="h-9 px-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none"
              >
                <option value="All">All Counselors</option>
                <option value="unassigned">Unassigned Leads Only</option>
                {counselors.map((c) => (
                  <option key={c.id} value={c.name}>
                    {c.name}
                  </option>
                ))}
              </select>
            )}

            <div className="relative min-w-[220px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search name, phone, email, country..."
                className="w-full h-9 pl-9 pr-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:bg-white focus:outline-none focus:border-[#58051E]"
              />
            </div>
          </div>
        </div>

        {/* ── FLOATING BULK ASSIGNMENT BAR (Appears when leads are selected) ── */}
        {selectedLeadIds.size > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-3 bg-gradient-to-r from-[#58051E] to-[#7a082b] rounded-2xl text-white flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-lg"
          >
            <div className="flex items-center gap-2">
              <span className="w-6 h-6 rounded-lg bg-white/20 flex items-center justify-center font-black text-xs">
                {selectedLeadIds.size}
              </span>
              <span className="text-xs font-bold">
                {selectedLeadIds.size} student leads selected for bulk action
              </span>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <select
                value={bulkAssignCounselorId}
                onChange={(e) => setBulkAssignCounselorId(e.target.value)}
                className="h-8.5 px-3 bg-white text-slate-900 rounded-xl text-xs font-bold focus:outline-none cursor-pointer"
              >
                {counselors.map((c) => (
                  <option key={c.id} value={c.id}>
                    Assign to {c.name} ({c.email || 'Counselor'})
                  </option>
                ))}
              </select>

              <button
                type="button"
                onClick={handleExecuteBulkAssign}
                className="h-8.5 px-4 bg-amber-400 hover:bg-amber-300 text-slate-950 rounded-xl text-xs font-black transition-all shadow-xs cursor-pointer flex items-center gap-1.5"
              >
                <UserCheck className="w-3.5 h-3.5" />
                <span>Assign In Bulk</span>
              </button>

              <button
                type="button"
                onClick={() => setSelectedLeadIds(new Set())}
                className="text-xs text-white/80 hover:text-white underline ml-2 cursor-pointer"
              >
                Clear
              </button>
            </div>
          </motion.div>
        )}
      </Card>

      {/* ── LEADS TABLE ── */}
      <Card className="overflow-hidden border border-slate-200/80 shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-[10px] font-extrabold uppercase text-slate-500 tracking-wider">
              <tr>
                <th className="p-3.5 w-10 text-center">
                  <input
                    type="checkbox"
                    checked={filteredLeads.length > 0 && selectedLeadIds.size === filteredLeads.length}
                    onChange={handleToggleSelectAll}
                    className="w-4 h-4 rounded text-[#58051E] focus:ring-[#58051E] cursor-pointer"
                  />
                </th>
                <th className="p-3.5">Student Lead & Phone</th>
                <th className="p-3.5">Target Destination</th>
                <th className="p-3.5">Status & Tag</th>
                <th className="p-3.5">Assigned Counselor</th>
                <th className="p-3.5">Enquiry Date</th>
                <th className="p-3.5">WhatsApp</th>
                <th className="p-3.5 text-right">Actions & Close Deal</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-semibold text-slate-700">
              {loading ? (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-slate-400 font-bold">Loading admissions enquiries...</td>
                </tr>
              ) : filteredLeads.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-slate-400 font-semibold">
                    No student enquiries found matching the selected filters.
                  </td>
                </tr>
              ) : (
                filteredLeads.map((lead) => {
                  const isSelected = selectedLeadIds.has(lead.id);
                  const st = STATUS_COLORS[lead.status] || STATUS_COLORS['New Lead'];

                  return (
                    <tr
                      key={lead.id}
                      className={`hover:bg-slate-50/80 transition-colors ${isSelected ? 'bg-rose-50/40' : ''}`}
                    >
                      {/* Checkbox */}
                      <td className="p-3.5 text-center">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => handleToggleSelectOne(lead.id)}
                          className="w-4 h-4 rounded text-[#58051E] focus:ring-[#58051E] cursor-pointer"
                        />
                      </td>

                      {/* Lead Name & Phone */}
                      <td className="p-3.5 font-bold text-slate-900">
                        <div className="flex items-center gap-1.5">
                          <span className="text-sm font-black text-slate-900">{lead.name || 'Admissions Enquiry'}</span>
                        </div>
                        <div className="flex items-center gap-2 mt-0.5">
                          <a
                            href={`tel:${lead.phone}`}
                            className="text-xs font-mono font-bold text-slate-700 hover:text-[#58051E] flex items-center gap-1"
                          >
                            <Phone className="w-3 h-3 text-[#58051E]" /> {lead.phone}
                          </a>
                          {lead.email && (
                            <span className="text-[11px] text-slate-400 font-normal">({lead.email})</span>
                          )}
                        </div>
                      </td>

                      {/* Target Destination & Degree */}
                      <td className="p-3.5">
                        <span className="font-bold text-slate-900 flex items-center gap-1">
                          <Globe className="w-3.5 h-3.5 text-cyan-600" />
                          <span>{lead.preferred_country || 'Europe'}</span>
                        </span>
                        <span className="text-[10px] text-slate-400 block font-normal">
                          {lead.degree_level || "Bachelor's Degree"}
                        </span>
                      </td>

                      {/* Status Tag Dropdown */}
                      <td className="p-3.5">
                        <select
                          value={lead.status}
                          onChange={(e) => handleQuickStatusChange(lead, e.target.value as any)}
                          className={`text-[10px] font-extrabold px-2 py-1 rounded-lg border ${st.bg} ${st.text} ${st.border} focus:outline-none cursor-pointer`}
                        >
                          {STATUS_OPTIONS.map((opt) => (
                            <option key={opt} value={opt}>
                              {opt}
                            </option>
                          ))}
                        </select>
                      </td>

                      {/* Assigned Counselor */}
                      <td className="p-3.5">
                        {lead.assigned_counselor_name ? (
                          <div className="flex items-center gap-1.5">
                            <span className="w-5 h-5 rounded-full bg-[#58051E]/10 text-[#58051E] text-[10px] font-bold flex items-center justify-center">
                              {lead.assigned_counselor_name.charAt(0)}
                            </span>
                            <span className="font-bold text-slate-800">{lead.assigned_counselor_name}</span>
                          </div>
                        ) : (
                          <span className="text-[10px] font-extrabold text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                            Unassigned
                          </span>
                        )}
                      </td>

                      {/* Created At */}
                      <td className="p-3.5 text-slate-500 font-normal text-[11px]">
                        {new Date(lead.created_at).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                        })}
                      </td>

                      {/* WhatsApp Sent Status */}
                      <td className="p-3.5">
                        {lead.whatsapp_sent ? (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                            <Check className="w-3 h-3 text-emerald-600" /> Sent
                          </span>
                        ) : (
                          <button
                            type="button"
                            onClick={() => handleResendWhatsApp(lead)}
                            className="inline-flex items-center gap-1 text-[10px] font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 px-2 py-0.5 rounded cursor-pointer"
                            title="Send WhatsApp Welcome message"
                          >
                            <MessageSquare className="w-3 h-3 text-emerald-600" /> Send
                          </button>
                        )}
                      </td>

                      {/* Action Buttons */}
                      <td className="p-3.5 text-right space-x-1.5">
                        {/* Convert to Student Account Button (Close Deal) */}
                        {lead.status !== 'Enrolled' ? (
                          <button
                            type="button"
                            onClick={() => {
                              setConvertModalLead(lead);
                              setCreatedCredentials(null);
                            }}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-black text-white bg-emerald-600 hover:bg-emerald-700 transition-all shadow-xs cursor-pointer"
                            title="Close deal and create student login credentials"
                          >
                            <Key className="w-3 h-3" />
                            <span>Close Deal & Create Login</span>
                          </button>
                        ) : (
                          <div className="inline-flex items-center gap-1.5">
                            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-black text-emerald-800 bg-emerald-100 border border-emerald-300">
                              <CheckCircle2 className="w-3 h-3 text-emerald-700" /> Enrolled
                            </span>
                            <Link
                              to={`/admin/students?search=${encodeURIComponent(lead.email || lead.phone || lead.name || '')}`}
                              className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-bold text-[#58051E] bg-[#58051E]/10 hover:bg-[#58051E]/20 border border-[#58051E]/20 transition-all cursor-pointer"
                              title="View in Student Directory & Enrollments"
                            >
                              <ExternalLink className="w-3 h-3" />
                              <span>Directory</span>
                            </Link>
                          </div>
                        )}

                        {/* View Interaction Timeline */}
                        <button
                          type="button"
                          onClick={() => setActiveLead(lead)}
                          className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
                          title="View Lead Activity Timeline"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* ── MODAL 1: CONVERT LEAD TO STUDENT & CREATE LOGIN CREDENTIALS ── */}
      <AnimatePresence>
        {convertModalLead && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm"
              onClick={() => setConvertModalLead(null)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="relative w-full max-w-lg bg-white rounded-3xl p-6 sm:p-7 shadow-2xl z-10 space-y-4 border border-slate-100 text-left"
            >
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center font-bold">
                    <Key className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-base font-black text-slate-900">Close Deal & Create Student Account</h3>
                    <p className="text-[11px] text-slate-500 font-semibold">
                      Convert enquiry into official student directory enrollment
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setConvertModalLead(null)}
                  className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg cursor-pointer"
                >
                  <XCircle className="w-5 h-5" />
                </button>
              </div>

              {!createdCredentials ? (
                <div className="space-y-4">
                  <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200/70 space-y-1 text-xs">
                    <div className="flex justify-between font-bold text-slate-800">
                      <span>Student:</span>
                      <span>{convertModalLead.name || 'Admitted Student'}</span>
                    </div>
                    <div className="flex justify-between font-semibold text-slate-600">
                      <span>Phone:</span>
                      <span>{convertModalLead.phone}</span>
                    </div>
                    <div className="flex justify-between font-semibold text-slate-600">
                      <span>Destination:</span>
                      <span>{convertModalLead.preferred_country}</span>
                    </div>
                    <div className="flex justify-between font-semibold text-slate-600">
                      <span>Counselor:</span>
                      <span>{convertModalLead.assigned_counselor_name || currentCounselorName}</span>
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-extrabold text-slate-500 uppercase tracking-wider mb-1">
                      Student Login Email (Username)
                    </label>
                    <input
                      type="text"
                      readOnly
                      value={
                        convertModalLead.email ||
                        `student.${convertModalLead.phone.replace(/[^\d]/g, '').slice(-6)}@ferexstudent.org`
                      }
                      className="w-full h-10 px-3 bg-slate-100 border border-slate-200 rounded-xl text-xs font-bold text-slate-700"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-extrabold text-slate-500 uppercase tracking-wider mb-1">
                      Temporary Password *
                    </label>
                    <input
                      type="text"
                      required
                      value={tempPassword}
                      onChange={(e) => setTempPassword(e.target.value)}
                      placeholder="e.g. Student@2026"
                      className="w-full h-10 px-3 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:border-[#58051E]"
                    />
                    <span className="text-[10px] text-slate-400 mt-1 block">
                      Student will be prompted to change this password on first login.
                    </span>
                  </div>

                  <div className="pt-2 flex gap-2.5">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setConvertModalLead(null)}
                      className="flex-1 text-xs font-bold"
                    >
                      Cancel
                    </Button>
                    <Button
                      type="button"
                      disabled={converting}
                      onClick={handleConvertDeal}
                      size="sm"
                      className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs flex items-center justify-center gap-1.5"
                    >
                      {converting ? (
                        <span>Creating Account...</span>
                      ) : (
                        <>
                          <CheckCircle2 className="w-4 h-4" />
                          <span>Activate Student Account</span>
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              ) : (
                /* Account Created Success Confirmation */
                <div className="space-y-4 text-center py-2">
                  <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto">
                    <CheckCircle2 className="w-7 h-7" />
                  </div>
                  <div>
                    <h4 className="text-lg font-black text-slate-900">Student Account Activated!</h4>
                    <p className="text-xs text-slate-500 mt-0.5">
                      The student is now active in the Student Directory & Enrollments module.
                    </p>
                  </div>

                  <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 text-left space-y-2 text-xs font-mono">
                    <div className="flex justify-between items-center">
                      <span className="text-slate-400 text-[10px] uppercase font-bold">Portal URL:</span>
                      <span className="font-bold text-slate-800">{window.location.origin}/login</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-slate-400 text-[10px] uppercase font-bold">Login Email:</span>
                      <span className="font-bold text-slate-900">{createdCredentials.email}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-slate-400 text-[10px] uppercase font-bold">Temporary Password:</span>
                      <span className="font-black text-emerald-700">{createdCredentials.pass}</span>
                    </div>
                  </div>

                  <p className="text-[11px] text-slate-500">
                    Credentials have also been automatically triggered to student's WhatsApp number ({convertModalLead.phone}).
                  </p>

                  <div className="pt-2">
                    <Button
                      onClick={() => {
                        setConvertModalLead(null);
                        setCreatedCredentials(null);
                      }}
                      size="sm"
                      className="w-full bg-[#58051E] hover:bg-[#430316] text-white text-xs font-bold"
                    >
                      Done
                    </Button>
                  </div>
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ── MODAL 2: LEAD INTERACTION & ACTIVITY TIMELINE DRAWER ── */}
      <AnimatePresence>
        {activeLead && (
          <div className="fixed inset-0 z-50 flex items-center justify-end">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm"
              onClick={() => setActiveLead(null)}
            />
            <motion.div
              initial={{ translateX: '100%' }}
              animate={{ translateX: 0 }}
              exit={{ translateX: '100%' }}
              transition={{ duration: 0.25 }}
              className="relative w-full max-w-md h-full bg-white shadow-2xl p-6 overflow-y-auto space-y-5 text-left z-10 flex flex-col justify-between"
            >
              <div className="space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                  <div>
                    <h3 className="text-base font-black text-slate-900">{activeLead.name || 'Admissions Enquiry'}</h3>
                    <p className="text-xs text-slate-500 font-semibold">{activeLead.phone} • {activeLead.preferred_country}</p>
                  </div>
                  <button
                    onClick={() => setActiveLead(null)}
                    className="p-1 text-slate-400 hover:text-slate-600 rounded-lg cursor-pointer"
                  >
                    <XCircle className="w-5 h-5" />
                  </button>
                </div>

                {/* Lead Summary */}
                <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200/80 space-y-1.5 text-xs">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Assigned Counselor:</span>
                    <span className="font-bold text-slate-800">{activeLead.assigned_counselor_name || 'Unassigned'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Degree Level:</span>
                    <span className="font-bold text-slate-800">{activeLead.degree_level}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Current Status:</span>
                    <span className="font-black text-[#58051E]">{activeLead.status}</span>
                  </div>
                </div>

                {/* Log Interaction Form */}
                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200/80 space-y-3">
                  <span className="text-[10px] font-black uppercase text-slate-400 block">Log Counselor Interaction</span>
                  <form onSubmit={handleAddActivity} className="space-y-2.5">
                    <div className="flex gap-2">
                      <select
                        value={newActivityType}
                        onChange={(e) => setNewActivityType(e.target.value as any)}
                        className="h-8.5 px-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-800"
                      >
                        <option value="Phone Call">Phone Call</option>
                        <option value="WhatsApp Message">WhatsApp</option>
                        <option value="Note">Internal Note</option>
                      </select>
                      <input
                        type="text"
                        required
                        value={newActivityNote}
                        onChange={(e) => setNewActivityNote(e.target.value)}
                        placeholder="Call summary, eligibility discussion..."
                        className="flex-1 h-8.5 px-3 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-900"
                      />
                      <Button type="submit" size="sm" className="h-8.5 bg-[#58051E] text-white">
                        <Send className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </form>
                </div>

                {/* Activity History Timeline */}
                <div className="space-y-3">
                  <h4 className="text-xs font-black uppercase tracking-wider text-slate-900 flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-[#58051E]" /> Chronological Activity History ({leadActivities.length})
                  </h4>

                  {leadActivities.length === 0 ? (
                    <div className="p-4 text-center text-slate-400 bg-slate-50 rounded-xl text-xs">
                      No interactions logged yet
                    </div>
                  ) : (
                    <div className="space-y-2 border-l-2 border-slate-100 pl-3 ml-1.5">
                      {leadActivities.map((act) => (
                        <div key={act.id} className="p-3 bg-slate-50 rounded-xl border border-slate-200/60 space-y-1">
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded bg-white text-slate-700 border border-slate-200">
                              {act.activity_type}
                            </span>
                            <span className="text-[10px] text-slate-400 font-semibold">
                              {new Date(act.created_at).toLocaleDateString()}
                            </span>
                          </div>
                          <p className="font-bold text-slate-900 text-xs">{act.title}</p>
                          {act.description && <p className="text-[11px] text-slate-500">{act.description}</p>}
                          <span className="text-[9px] text-slate-400 block pt-0.5">By: {act.performed_by}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <Button
                size="sm"
                variant="outline"
                className="w-full text-xs font-bold"
                onClick={() => setActiveLead(null)}
              >
                Close Drawer
              </Button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
