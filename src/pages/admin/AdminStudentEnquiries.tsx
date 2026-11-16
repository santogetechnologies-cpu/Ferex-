import { closuresForMonth, monthKey } from '../../lib/leadClosures';
import { generateTempPassword } from '../../lib/api/students';
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
  getLeadDeletionPeriodInfo,
  type EducationLead,
  type EducationLeadActivity,
  type CounselorPerformanceMetric
} from '../../lib/api/educationLeads';
import { getEducationStaff, type DivisionStaffMember } from '../../lib/api/staff';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import { Link } from 'react-router-dom';
import { BlockCap } from '../../components/CapLoader';

interface AdminStudentEnquiriesProps {
  isStaff?: boolean; // When true, runs in Counselor portal view
}

const WhatsAppIcon: React.FC<{ className?: string }> = ({ className = 'w-3 h-3' }) => (
  <svg viewBox="0 0 24 24" className={className} fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
    <path
      fill="#25D366"
      d="M12.04 2c-5.46 0-9.91 4.45-9.91 9.91 0 1.75.46 3.45 1.32 4.95L2.05 22l5.25-1.38c1.45.79 3.08 1.21 4.74 1.21 5.46 0 9.91-4.45 9.91-9.91 0-2.65-1.03-5.14-2.9-7.01A9.816 9.816 0 0012.04 2z"
    />
    <path
      fill="#ffffff"
      d="M17.47 14.38c-.3-.15-1.78-.88-2.06-.98-.28-.1-.48-.15-.68.15-.2.3-.78.98-.96 1.18-.18.2-.35.23-.65.08-.3-.15-1.27-.47-2.42-1.5-.9-.8-1.5-1.79-1.68-2.09-.18-.3-.02-.46.13-.61.14-.14.3-.35.45-.53.15-.18.2-.3.3-.5.1-.2.05-.38-.03-.53-.08-.15-.68-1.63-.93-2.24-.24-.59-.49-.51-.68-.52-.18-.01-.38-.01-.58-.01-.2 0-.53.08-.8.38-.28.3-1.06 1.03-1.06 2.51s1.08 2.91 1.23 3.12c.15.2 2.13 3.24 5.15 4.55.72.31 1.28.5 1.72.64.72.23 1.38.2 1.9.12.58-.09 1.78-.73 2.03-1.43.25-.7.25-1.31.18-1.43-.08-.13-.28-.2-.58-.35z"
    />
  </svg>
);

const STATUS_OPTIONS: EducationLead['status'][] = [
  'New Lead',
  'Contacted',
  'Interested',
  'Follow Up',
  'Not Interested',
  'Enrolled'
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

// What the visitor typed on the enquiry page: course and intake travel in the notes; anything else is shown as-is.
const leadDetails = (lead: EducationLead) => {
  const notes = (lead.notes || '').trim();
  const intake = notes.match(/Intake:\s*([^·\n]+)/i)?.[1]?.trim() || '';
  const courseNote = notes.match(/Course:\s*([^·\n]+)/i)?.[1]?.trim() || '';
  const extra = notes.replace(/Course:\s*[^·\n]+/i, '').replace(/Intake:\s*[^·\n]+/i, '').replace(/^[\s·]+|[\s·]+$/g, '').replace(/\s*·\s*·\s*/g, ' · ');
  return { course: (lead.degree_level || courseNote || '').trim(), intake, extra };
};

export const AdminStudentEnquiries: React.FC<AdminStudentEnquiriesProps> = ({ isStaff = false }) => {
  const { profile } = useAuth();
  const currentCounselorName = (profile?.full_name || '').trim();

  const [leads, setLeads] = useState<EducationLead[]>([]);
  const [counselors, setCounselors] = useState<DivisionStaffMember[]>([]);
  const [metrics, setMetrics] = useState<CounselorPerformanceMetric[]>([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState('');

  // Filters
  const [statusFilter, setStatusFilter] = useState<string>('All');
  // Default to 'All'; useEffect below sets the counselor filter once profile is loaded
  const [counselorFilter, setCounselorFilter] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [closureMonth, setClosureMonth] = useState(() => monthKey(new Date().toISOString()));

  // Fix: profile loads async — update counselor filter once full_name is available
  useEffect(() => {
    if (isStaff && currentCounselorName && counselorFilter === 'All') {
      setCounselorFilter(currentCounselorName);
    }
  }, [isStaff, currentCounselorName]);

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
  const [tempPassword, setTempPassword] = useState('');
  const [convertEmail, setConvertEmail] = useState('');
  const [showClosures, setShowClosures] = useState(false);
  const [convertCounselorId, setConvertCounselorId] = useState('');
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

  // Status Change Handler with Automatic Student Directory Sync & 14-day Deletion Rule
  const handleQuickStatusChange = async (lead: EducationLead, newStatus: EducationLead['status']) => {
    try {
      if (newStatus === 'Enrolled' && !lead.converted_student_id) {
        // Closing creates a login, so the credentials must be shown to the person closing the deal.
        setConvertModalLead(lead);
      } else {
        const updates: Partial<EducationLead> = { status: newStatus };
        if (newStatus === 'Not Interested') {
          // Record exact date and time for 14-day deletion period
          updates.not_interested_at = new Date().toISOString();
        } else if (lead.status === 'Not Interested') {
          // Cancel scheduled deletion when moved away from Not Interested
          updates.not_interested_at = null;
        }

        const updated = await updateEducationLead(lead.id, updates, profile?.full_name || 'Staff');
        showToastMsg(`Updated "${lead.name || lead.phone}" status to "${newStatus}"`);

        // If active lead drawer is currently open for this lead, update it in realtime
        if (activeLead && activeLead.id === lead.id && updated) {
          setActiveLead(updated);
        }
      }
      await loadData();
    } catch (err: any) {
      showToastMsg(`Error: ${err.message}`);
    }
  };

  // Resend WhatsApp Handler
  const handleResendWhatsApp = async (lead: EducationLead) => {
    try {
      const res = await sendLeadWhatsAppWelcome(lead, undefined, true);
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

  useEffect(() => {
    if (convertModalLead) {
      setConvertEmail(convertModalLead.email || '');
      setTempPassword(generateTempPassword());
      setConvertCounselorId('');
    }
  }, [convertModalLead]);

  // Convert Lead Deal to Student Account with Temporary Password
  const handleConvertDeal = async () => {
    if (!convertModalLead) return;
    const chosen = counselors.find(c => c.id === convertCounselorId);
    if (!convertModalLead.assigned_counselor_name && !chosen) {
      showToastMsg('Choose the counselor who will guide this student before closing the deal.');
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(convertEmail.trim())) {
      showToastMsg('Enter the student\'s real email address. It becomes their login.');
      return;
    }
    if (tempPassword.trim().length < 8) {
      showToastMsg('The temporary password must be at least 8 characters.');
      return;
    }
    setConverting(true);
    try {
      const res = await convertLeadToStudentAccount(
        convertModalLead.id,
        tempPassword.trim(),
        profile?.full_name || 'Admissions Counselor',
        chosen ? { id: chosen.id, name: chosen.name, email: chosen.email } : undefined,
        convertEmail.trim()
      );

      if (res.success) {
        setCreatedCredentials({
          email: res.email || convertModalLead.email || 'student@ferexstudent.org',
          pass: res.tempPassword || tempPassword,
        });
        showToastMsg(`🎉 Deal Closed! Student portal account created for "${convertModalLead.name || convertModalLead.phone}".${res.warnings?.length ? ' Note: ' + res.warnings.join(' ') : ''}`);
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

  // Who is closing the most: every counselor, ranked by deals closed.
  const leaderboard = useMemo(() => {
    const month = closureMonth;
    const map = new Map<string, { name: string; assigned: number; closed: number; closedMonth: number; active: number }>();
    const row = (name: string) => { if (!map.has(name)) map.set(name, { name, assigned: 0, closed: 0, closedMonth: 0, active: 0 }); return map.get(name)!; };
    counselors.forEach(c => row(c.name));
    leads.forEach(l => {
      const name = (l.assigned_counselor_name || l.converted_by || '').trim();
      if (!name) return;
      const r = row(name);
      r.assigned += 1;
      const closed = l.status === 'Enrolled' || Boolean(l.converted_student_id);
      if (closed) { r.closed += 1; if (monthKey(l.converted_at || l.updated_at || l.created_at) === month) r.closedMonth += 1; }
      else if (!['Lost', 'Not Interested'].includes(l.status)) r.active += 1;
    });
    return Array.from(map.values()).sort((a, b) => b.closed - a.closed || b.closedMonth - a.closedMonth || a.name.localeCompare(b.name));
  }, [leads, counselors, closureMonth]);

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

  // Counts for Status Tabs — scoped to counselor when in staff view
  const statusCounts = useMemo(() => {
    // Apply only the counselor scope (not status/search) for accurate tab counts
    const scopedLeads = isStaff && counselorFilter !== 'All'
      ? leads.filter((l) => {
          const assignedName = (l.assigned_counselor_name || '').toLowerCase();
          return assignedName.includes(counselorFilter.toLowerCase());
        })
      : leads;
    const counts: Record<string, number> = { All: scopedLeads.length };
    for (const opt of STATUS_OPTIONS) {
      counts[opt] = scopedLeads.filter((l) => l.status === opt).length;
    }
    return counts;
  }, [leads, isStaff, counselorFilter]);

  // Best Performing Counselor
  // Deals closed in the chosen month, grouped by counselor (staff only see their own).
  const closures = useMemo(() => {
    const visible = isStaff && currentCounselorName
      ? leads.filter(l => (l.assigned_counselor_name || l.converted_by || '').trim() === currentCounselorName)
      : leads;
    return closuresForMonth(visible, closureMonth);
  }, [leads, closureMonth, isStaff, currentCounselorName]);

  const topCounselor = (() => { const t = leaderboard.find(c => c.closed > 0); return t ? { counselor_name: t.name, enrolled: t.closed, conversion_rate: t.assigned ? Math.round((t.closed / t.assigned) * 100) : 0 } : undefined; })();

  return (
    <div className="space-y-6 text-left antialiased">
      <ToastNotification message={toast} onClose={() => setToast('')} />

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-black text-slate-900 tracking-tight flex items-center gap-2">
              <Users className="w-5 h-5 text-[#58051E]" /> Enquiries
            </h1>
            <span className="text-[10px] font-extrabold bg-[#58051E]/10 text-[#58051E] px-2.5 py-0.5 rounded-full border border-[#58051E]/20">
              {isStaff ? 'My Assigned Leads' : 'Full Admissions Pipeline'}
            </span>
          </div>
          <p className="text-xs font-semibold text-slate-500 mt-0.5">
            Student leads, counselor assignment and account creation.
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

      {/* ── Counselor leaderboard (admin) ── */}
      {!isStaff && leaderboard.length > 0 && (
        <Card className="p-4 border border-slate-200/80 shadow-xs space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2"><TrendingUp className="w-4 h-4 text-[#58051E]" /><h3 className="text-xs font-black uppercase tracking-wider text-slate-800">Who is closing the most</h3></div>
            <span className="text-[11px] font-semibold text-slate-500">Deals closed, all time and in {closureMonth}</span>
          </div>
          <ol className="space-y-2">
            {leaderboard.map((c, i) => {
              const max = Math.max(1, leaderboard[0].closed);
              const rate = c.assigned ? Math.round((c.closed / c.assigned) * 100) : 0;
              return (
                <li key={c.name} className="flex items-center gap-3">
                  <span className={`w-6 h-6 rounded-full text-[11px] font-black flex items-center justify-center shrink-0 ${i === 0 && c.closed > 0 ? 'bg-amber-400 text-slate-900' : 'bg-slate-100 text-slate-600'}`}>{i + 1}</span>
                  <span className="w-36 sm:w-48 text-sm font-bold text-slate-900 truncate">{c.name}</span>
                  <div className="flex-1 h-2.5 rounded-full bg-slate-100 overflow-hidden min-w-[3rem]"><div className="h-full rounded-full bg-emerald-500 transition-all" style={{ width: `${(c.closed / max) * 100}%` }} /></div>
                  <span className="w-44 text-right text-xs text-slate-600 tabular-nums whitespace-nowrap"><b className="text-slate-900">{c.closed}</b> closed · {c.closedMonth} this month</span>
                  <span className="hidden md:block w-32 text-right text-[11px] text-slate-500 tabular-nums">{c.assigned} assigned · {rate}%</span>
                </li>
              );
            })}
          </ol>
        </Card>
      )}

      {/* ── Monthly Closures: which counselor closed which student ── */}
      <Card className="p-4 border border-slate-200/80 shadow-xs space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-700" />
            <h3 className="text-xs font-black uppercase tracking-wider text-slate-800">
              Closed Deals by Counselor — {closures.total} student{closures.total === 1 ? '' : 's'}
            </h3>
          </div>
          <button type="button" onClick={() => setShowClosures(v => !v)} aria-expanded={showClosures} className="ml-auto h-8 px-3 rounded-lg border border-slate-200 text-xs font-bold text-slate-700 hover:bg-slate-50 cursor-pointer">{showClosures ? 'Hide students' : 'Show students'}</button>
          <input
            type="month"
            aria-label="Closure month"
            value={closureMonth}
            max={monthKey(new Date().toISOString())}
            onChange={e => e.target.value && setClosureMonth(e.target.value)}
            className="h-8 px-2 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-800"
          />
        </div>
        {showClosures && (<>
        {closures.byCounselor.length === 0 ? (
          <p className="text-xs font-semibold text-slate-500 py-2">No deals were closed in this month.</p>
        ) : (
          <div className="space-y-3">
            {closures.byCounselor.map(group => (
              <div key={group.counselor} className="border border-slate-200 rounded-xl overflow-hidden">
                <div className="flex items-center justify-between px-3 py-2 bg-slate-50 text-xs font-black text-slate-800">
                  <span>{group.counselor}</span>
                  <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px]">{group.count} closed</span>
                </div>
                <table className="w-full text-left text-xs">
                  <tbody className="divide-y divide-slate-100 font-semibold text-slate-700">
                    {group.students.map(st => (
                      <tr key={st.leadId}>
                        <td className="px-3 py-1.5 font-bold text-slate-900">{st.studentName}</td>
                        <td className="px-3 py-1.5">{st.phone}</td>
                        <td className="px-3 py-1.5">{st.country}</td>
                        <td className="px-3 py-1.5 text-right text-slate-500">{new Date(st.closedAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ))}
          </div>
        )}
        </>)}
      </Card>


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

      {/* ── LEADS TABLE: two lines per enquiry so every action fits without sideways scrolling ── */}
      <Card className="overflow-hidden border border-slate-200/80 shadow-xs">
        <table className="w-full table-fixed text-left text-xs">
          <thead className="bg-slate-50 border-b border-slate-200 text-[10px] font-extrabold uppercase text-slate-500 tracking-wider">
            <tr>
              <th className="p-3 w-10 text-center">
                <input type="checkbox" aria-label="Select all" checked={filteredLeads.length > 0 && selectedLeadIds.size === filteredLeads.length} onChange={handleToggleSelectAll} className="w-4 h-4 rounded text-[#58051E] focus:ring-[#58051E] cursor-pointer" />
              </th>
              <th className="p-3 w-[24%]">Student</th>
              <th className="p-3 w-[27%]">Interest</th>
              <th className="p-3 w-[18%]">Status · Counselor</th>
              <th className="p-3 w-[12%] hidden xl:table-cell">Enquired</th>
              <th className="p-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 font-semibold text-slate-700">
            {loading ? (
              <tr><td colSpan={6} className="p-8"><BlockCap /></td></tr>
            ) : filteredLeads.length === 0 ? (
              <tr><td colSpan={6} className="p-8 text-center text-slate-400 font-semibold">No student enquiries found matching the selected filters.</td></tr>
            ) : (
              filteredLeads.map((lead) => {
                const isSelected = selectedLeadIds.has(lead.id);
                const st = STATUS_COLORS[lead.status] || STATUS_COLORS['New Lead'];
                const d = leadDetails(lead);
                return (
                  <tr key={lead.id} className={`align-top hover:bg-slate-50/80 transition-colors ${isSelected ? 'bg-rose-50/40' : ''}`}>
                    <td className="p-3 text-center">
                      <input type="checkbox" aria-label={`Select ${lead.name || lead.phone}`} checked={isSelected} onChange={() => handleToggleSelectOne(lead.id)} className="w-4 h-4 rounded text-[#58051E] focus:ring-[#58051E] cursor-pointer" />
                    </td>

                    <td className="p-3 min-w-0">
                      <div className="text-sm font-black text-slate-900 truncate">{lead.name || 'Admissions Enquiry'}</div>
                      <div className="mt-0.5 flex items-center gap-1.5 text-[11px] text-slate-500 min-w-0">
                        <a href={`tel:${lead.phone}`} className="font-mono font-bold text-slate-700 hover:text-[#58051E] shrink-0">{lead.phone}</a>
                        {lead.email && <span className="truncate">· {lead.email}</span>}
                      </div>
                    </td>

                    <td className="p-3 min-w-0">
                      <div className="flex items-center gap-1.5 text-slate-900 font-bold min-w-0"><Globe className="w-3.5 h-3.5 text-cyan-600 shrink-0" /><span className="truncate">{lead.preferred_country || 'Europe'}</span>{d.course && <span className="truncate font-semibold text-slate-600">· {d.course}</span>}</div>
                      <div className="mt-0.5 text-[11px] text-slate-500 font-normal truncate" title={[d.intake && `Intake: ${d.intake}`, d.extra].filter(Boolean).join(' · ')}>
                        {[d.intake && `Intake: ${d.intake}`, d.extra].filter(Boolean).join(' · ') || 'No other details given'}
                      </div>
                    </td>

                    <td className="p-3 min-w-0">
                      <select value={lead.status} onChange={(e) => handleQuickStatusChange(lead, e.target.value as any)} aria-label="Status" className={`max-w-full text-[10px] font-extrabold px-2 py-1 rounded-lg border ${st.bg} ${st.text} ${st.border} focus:outline-none cursor-pointer`}>
                        {STATUS_OPTIONS.map((opt) => <option key={opt} value={opt}>{opt}</option>)}
                      </select>
                      <div className="mt-1 text-[11px] truncate">
                        {lead.assigned_counselor_name
                          ? <span className="font-bold text-slate-700">{lead.assigned_counselor_name}</span>
                          : <span className="font-extrabold text-amber-700">Unassigned</span>}
                      </div>
                    </td>

                    <td className="p-3 hidden xl:table-cell text-[11px] text-slate-500 font-normal">
                      <div>{new Date(lead.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</div>
                      <div className="mt-0.5">
                        {lead.whatsapp_sent
                          ? <span className="inline-flex items-center gap-1 font-bold text-emerald-700"><WhatsAppIcon className="w-3 h-3 shrink-0" /> WhatsApp sent</span>
                          : <button type="button" onClick={() => handleResendWhatsApp(lead)} className="inline-flex items-center gap-1 font-bold text-slate-600 hover:text-emerald-700 cursor-pointer"><WhatsAppIcon className="w-3 h-3 shrink-0" /> Send WhatsApp</button>}
                      </div>
                    </td>

                    <td className="p-3 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {lead.status !== 'Enrolled' ? (
                          <button type="button" onClick={() => { setConvertModalLead(lead); setCreatedCredentials(null); }} className="inline-flex items-center gap-1 px-2.5 h-8 rounded-lg text-xs font-black text-white bg-emerald-600 hover:bg-emerald-700 shadow-xs cursor-pointer whitespace-nowrap" title="Close the deal and create the student's login">
                            <Key className="w-3 h-3" /> Close deal
                          </button>
                        ) : (
                          <Link to={`/admin/students?search=${encodeURIComponent(lead.email || lead.phone || lead.name || '')}`} className="inline-flex items-center gap-1 px-2.5 h-8 rounded-lg text-xs font-bold text-emerald-800 bg-emerald-100 border border-emerald-300 whitespace-nowrap" title="Open in Students">
                            <CheckCircle2 className="w-3 h-3" /> Enrolled
                          </Link>
                        )}
                        <button type="button" onClick={() => setActiveLead(lead)} aria-label="Open timeline" className="p-1.5 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-100 cursor-pointer" title="Timeline and notes"><Eye className="w-4 h-4" /></button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
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
                      <span>{convertModalLead.assigned_counselor_name || (convertCounselorId ? '' : 'Not assigned')}</span>
                    </div>
                  </div>

                  {!convertModalLead.assigned_counselor_name && (
                    <div>
                      <label className="block text-[11px] font-extrabold text-slate-500 uppercase tracking-wider mb-1">
                        Assign Counselor *
                      </label>
                      <select
                        aria-label="Assign counselor"
                        value={convertCounselorId}
                        onChange={(e) => setConvertCounselorId(e.target.value)}
                        className="w-full h-10 px-3 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:border-[#58051E]"
                      >
                        <option value="">Select the counselor for this student…</option>
                        {counselors.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                      </select>
                    </div>
                  )}

                  <div>
                    <label className="block text-[11px] font-extrabold text-slate-500 uppercase tracking-wider mb-1">
                      Student login email (username) *
                    </label>
                    <input
                      type="email"
                      required
                      value={convertEmail}
                      onChange={(e) => setConvertEmail(e.target.value)}
                      placeholder="student@example.com"
                      className="w-full h-10 px-3 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:border-[#58051E]"
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
                      minLength={8}
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

                {/* Automatic 14-Day Deletion Notice for Not Interested Enquiries */}
                {activeLead.status === 'Not Interested' && (() => {
                  const delInfo = getLeadDeletionPeriodInfo(activeLead.not_interested_at || activeLead.updated_at);
                  const markedDate = activeLead.not_interested_at
                    ? new Date(activeLead.not_interested_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
                    : new Date(activeLead.updated_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
                  return (
                    <div className="p-3.5 bg-rose-50/80 rounded-2xl border border-rose-200 space-y-2 text-xs">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5 font-black text-rose-900">
                          <Clock className="w-3.5 h-3.5 text-rose-700" />
                          <span>Automatic 14-Day Deletion Rule</span>
                        </div>
                        <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-rose-100 text-rose-800 border border-rose-200">
                          Scheduled
                        </span>
                      </div>

                      <div className="space-y-1.5 pt-1 text-slate-700 text-xs">
                        <div className="flex justify-between items-center">
                          <span className="text-slate-500">Status Changed:</span>
                          <span className="font-semibold text-slate-800">{markedDate}</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-slate-500">Scheduled Deletion:</span>
                          <span className="font-semibold text-slate-900">{delInfo?.formattedDeletionDate || 'In 14 days'}</span>
                        </div>
                        <div className="flex justify-between items-center pt-1 border-t border-rose-200/60">
                          <span className="font-bold text-rose-950">Remaining Period:</span>
                          <span className="font-black text-rose-700 text-xs bg-white border border-rose-300 px-2 py-0.5 rounded-md shadow-2xs">
                            {delInfo?.formattedRemaining || '14 days'}
                          </span>
                        </div>
                      </div>

                      <p className="text-[10px] text-slate-500 leading-tight pt-0.5">
                        This enquiry will be automatically deleted when the 14-day period expires. Changing the status to any other status cancels this deletion.
                      </p>
                    </div>
                  );
                })()}

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
