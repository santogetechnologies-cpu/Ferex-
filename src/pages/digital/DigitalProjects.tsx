import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FolderKanban, Search, Plus, X, CheckCircle2, Trash2,
  ExternalLink, Paperclip, ChevronRight, Layers,
  Building2, Globe2, Edit3, UserCheck, Shield, DollarSign, Split, AlertTriangle
} from 'lucide-react';
import { Card } from '../../components/Card';
import { Button } from '../../components/Button';
import { ToastNotification } from '../../components/ToastNotification';
import { generateUUID } from '../../utils/uuid';
import { supabase } from '../../lib/supabase';
import {
  getDigitalProjects,
  createDigitalProject,
  updateDigitalProject,
  reassignDigitalProject,
  deleteDigitalProject,
  advanceDigitalProjectStage,
  addDigitalDeliverable,
  deleteDigitalDeliverable,
  reviewDigitalDeliverable,
  getDigitalClients,
  getDigitalStaffMembers,
  type DigitalProjectRecord,
  type DigitalProjectStage,
  type DigitalDeliverable
} from '../../lib/api/digital';
import { useAuth } from '../../contexts/AuthContext';
import { useDigitalPermissions } from '../../hooks/usePermissions';
import { getMasters } from '../../lib/api/masters';
import { getCommerceSettings, saveContract } from '../../lib/api/digitalCommerce';
import { trackContract, money, type CommerceBody } from '../../lib/digitalCommerce';
import { Link } from 'react-router-dom';
import { DIGITAL_CURRENCIES, formatDigitalCurrency, getCurrencySymbol } from '../../lib/digitalCurrency';

const DEFAULT_STAGES: DigitalProjectStage[] = ['Briefing', 'In Progress', 'Review', 'Revisions', 'Delivered', 'Closed'];

export const DigitalProjects: React.FC = () => {
  const { profile } = useAuth();
  const { isAdmin, isStaff, isCentral, canViewAllCRM, canDelete, canAssign } = useDigitalPermissions();

  const [projects, setProjects] = useState<DigitalProjectRecord[]>([]);
  const [clients, setClients] = useState<any[]>([]);
  const [staffList, setStaffList] = useState<any[]>([]);
  const [stages, setStages] = useState<string[]>(DEFAULT_STAGES);
  const [serviceCategories, setServiceCategories] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [clientTypeFilter, setClientTypeFilter] = useState<'All' | 'Internal' | 'External'>('All');
  const [stageFilter, setStageFilter] = useState<string>('All');
  const [myProjectsOnly, setMyProjectsOnly] = useState(false);

  // Inline project title editing
  const [editingTitleId, setEditingTitleId] = useState<string | null>(null);
  const [editingTitleVal, setEditingTitleVal] = useState<string>('');

  // Pagination state (10 / 25 / 50)
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState<number>(10);

  // Modals & Drawers
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedProject, setSelectedProject] = useState<DigitalProjectRecord | null>(null);
  const [showDeliverableModal, setShowDeliverableModal] = useState(false);
  const [reassignProject, setReassignProject] = useState<DigitalProjectRecord | null>(null);
  const [reassignStaffName, setReassignStaffName] = useState<string>('');
  const [toast, setToast] = useState('');

  // New Project Form State
  const [newProj, setNewProj] = useState({
    title: '',
    client_id: '',
    client_name: '',
    client_type: 'Internal' as 'Internal' | 'External',
    scope: '',
    service_category: 'Digital Marketing & Performance Ads',
    budget: 500000,
    currency: 'INR' as string,
    payment_terms: 'Advance Payment (30% Upfront)' as string,
    payment_split_type: 'advance_30' as 'advance_30' | 'advance_50' | 'three_milestones' | 'full' | 'custom_advance',
    advance_percentage: 30,
    start_date: new Date().toISOString().split('T')[0],
    deadline: new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0],
    assigned_staff_id: '',
    country: '',
    status: 'Briefing' as DigitalProjectStage,
  });

  // Custom milestone parts for project creation
  const [customMilestoneParts, setCustomMilestoneParts] = useState([
    { label: 'Advance', percentage: 40 },
    { label: 'Milestone', percentage: 30 },
    { label: 'Final', percentage: 30 },
  ]);

  // Scope Cost Breakdown (component-level specification separate from payment milestones)
  const [showProjBreakdown, setShowProjBreakdown] = useState(false);
  const [projBreakdown, setProjBreakdown] = useState<Array<{ id: string; component: string; amount: number }>>([
    { id: '1', component: 'UI/UX Design', amount: 0 },
    { id: '2', component: 'Frontend Development', amount: 0 },
    { id: '3', component: 'Backend & API', amount: 0 },
  ]);

  // New Deliverable Form State
  const [newDeliv, setNewDeliv] = useState({
    title: '',
    type: 'Figma' as DigitalDeliverable['type'],
    url: '',
    notes: '',
    status: 'Submitted' as 'Draft' | 'Submitted' | 'Approved'
  });

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(''), 3000);
  };

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [projData, clientData, realStaff, masterStages, categories] = await Promise.all([
        getDigitalProjects(),
        getDigitalClients(),
        getDigitalStaffMembers(),
        getMasters('digital', 'project_stages'),
        getMasters('digital', 'service_categories')
      ]);
      setClients(clientData || []);
      setProjects(projData || []);

      // Only real team members with a login can be assigned work.
      const staff = (realStaff || []).filter((m: any) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(m.id || ''));
      setStaffList(staff);

      if (masterStages && masterStages.length > 0) setStages(masterStages);
      if (categories && categories.length > 0) setServiceCategories(categories);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();

    const channel = supabase
      .channel('realtime_digital_projects')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'digital_projects' }, () => {
        loadData();
      })
      .subscribe();

    const handleLocalChange = () => loadData();
    window.addEventListener('ferex_digital_projects_change', handleLocalChange);
    window.addEventListener('ferex_digital_staff_change', handleLocalChange);
    window.addEventListener('ferex_staff_users_change', handleLocalChange);

    return () => {
      supabase.removeChannel(channel);
      window.removeEventListener('ferex_digital_projects_change', handleLocalChange);
      window.removeEventListener('ferex_digital_staff_change', handleLocalChange);
      window.removeEventListener('ferex_staff_users_change', handleLocalChange);
    };
  }, [loadData]);

  // Keep selected project in sync
  useEffect(() => {
    if (selectedProject) {
      const fresh = projects.find(p => p.id === selectedProject.id);
      if (fresh) setSelectedProject(fresh);
    }
  }, [projects, selectedProject]);

  /** Builds the contract (services and milestone payment terms) from what was entered on the project form. */
  const buildBilling = async (created: DigitalProjectRecord, clientEmail: string): Promise<CommerceBody> => {
    const settings = await getCommerceSettings();
    const country = newProj.country.toUpperCase();
    const tax = settings.taxes.find(t => t.country === country) || settings.taxes.find(t => t.country === '*') || { label: 'No tax', rate: 0 };
    const budget = Number(newProj.budget);

    const components = projBreakdown.filter(b => Number(b.amount) > 0);
    let lines;
    if (showProjBreakdown && components.length > 0) {
      const sum = components.reduce((acc, c) => acc + Number(c.amount), 0);
      if (Math.abs(sum - budget) > 0.005) throw new Error(`The scope breakdown adds up to ${sum.toLocaleString()} but the budget is ${budget.toLocaleString()}.`);
      lines = components.map(c => ({ id: generateUUID(), title: c.component, amount: Number(c.amount), tax_rate: tax.rate, tax_label: tax.label }));
    } else {
      lines = [{ id: generateUUID(), title: created.title, amount: budget, tax_rate: tax.rate, tax_label: tax.label }];
    }
    const shares = termShares();
    const start = new Date(newProj.start_date).getTime(), end = new Date(newProj.deadline).getTime();
    const dueFor = (i: number) => new Date(shares.length === 1 ? start : start + ((end - start) * i) / (shares.length - 1)).toLocaleDateString('en-CA');
    return {
      project_id: created.id,
      project_title: created.title,
      client_name: created.client_name,
      client_email: clientEmail,
      country,
      currency: newProj.currency || 'INR',
      lines,
      parts: shares.map((sh, i) => ({ id: generateUUID(), label: sh.label, percentage: sh.pct, due_date: dueFor(i), service_ids: lines.map(l => l.id) })),
      notes: newProj.scope || '',
      agency_name: settings.agency_name,
      agency_address: settings.address,
      agency_tax_number: settings.tax_number,
      payment_instructions: settings.payment_instructions || '',
    } as CommerceBody;
  };

  /** The milestone payment shares chosen on the form. They always add up to 100%. */
  const termShares = (): Array<{ label: string; pct: number }> => {
    switch (newProj.payment_split_type) {
      case 'advance_50': return [{ label: 'Advance (50%)', pct: 50 }, { label: 'Balance on delivery (50%)', pct: 50 }];
      case 'three_milestones': return [{ label: 'Kickoff advance (40%)', pct: 40 }, { label: 'Milestone review (30%)', pct: 30 }, { label: 'Final handover (30%)', pct: 30 }];
      case 'full': return [{ label: 'Full payment (100%)', pct: 100 }];
      case 'custom_advance': return customMilestoneParts.map(c => ({ label: `${c.label || 'Milestone'} (${c.percentage}%)`, pct: Number(c.percentage) }));
      default: return [{ label: 'Advance (30%)', pct: 30 }, { label: 'Balance on delivery (70%)', pct: 70 }];
    }
  };

  const [creating, setCreating] = useState(false);
  const [drawerContract, setDrawerContract] = useState<any>(null);

  // Billing for the open project (admins only; the database hides contracts from everyone else).
  useEffect(() => {
    setDrawerContract(null);
    if (!selectedProject) return;
    let cancelled = false;
    supabase.from('digital_contracts').select('*').eq('project_id', selectedProject.id).maybeSingle().then(({ data }) => { if (!cancelled) setDrawerContract(data); });
    return () => { cancelled = true; };
  }, [selectedProject?.id, projects]);

  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (creating) return;
    if (!newProj.title.trim()) { showToast('Enter the project title.'); return; }
    const selectedClient = clients.find(c => c.id === newProj.client_id);
    if (!selectedClient) { showToast('Select the client this project is for.'); return; }
    const staff = staffList.find(s => s.id === newProj.assigned_staff_id);
    if (!staff) { showToast('Choose the team member who will lead this project.'); return; }
    const budgetVal = Number(newProj.budget);
    if (!(budgetVal > 0)) { showToast('Enter the project budget.'); return; }
    if (!/^[A-Za-z]{2}$/.test(newProj.country)) { showToast('Enter the 2-letter country code used for billing (for example IN, US, AE).'); return; }
    const shares = termShares();
    if (Math.abs(shares.reduce((acc, x) => acc + x.pct, 0) - 100) > 0.0001 || shares.some(x => !(x.pct > 0))) { showToast('The milestone percentages must add up to exactly 100%.'); return; }

    setCreating(true);
    try {
      const created = await createDigitalProject({
        title: newProj.title.trim(),
        client_id: selectedClient.id,
        scope: newProj.scope,
        description: newProj.scope,
        service_category: newProj.service_category,
        budget: budgetVal,
        payment_terms: newProj.payment_terms,
        start_date: newProj.start_date,
        deadline: newProj.deadline,
        assigned_staff_id: staff.id,
        status: newProj.status,
        currency: newProj.currency,
        country: newProj.country.toUpperCase(),
        created_by: profile?.full_name || '',
      });

      // The contract is the single source of truth for payments: services, milestones and partial collections.
      let billingNote = '';
      try {
        await saveContract(await buildBilling(created, selectedClient.email || ''));
      } catch (err: any) {
        billingNote = ` Billing was not configured yet: ${err.message}. Finish it from Billing.`;
      }

      setShowAddModal(false);
      showToast(`Created "${created.title}" and assigned it to ${staff.name}.${billingNote}`);
      setNewProj({
        title: '', client_id: '', client_name: '', client_type: 'Internal', scope: '', service_category: serviceCategories[0] || 'Digital Marketing & Performance Ads',
        budget: 0, currency: 'INR', payment_terms: 'Advance Payment (30% Upfront)', payment_split_type: 'advance_30', advance_percentage: 30,
        start_date: new Date().toISOString().split('T')[0], deadline: new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0],
        assigned_staff_id: '', country: '', status: 'Briefing',
      });
      setCustomMilestoneParts([{ label: 'Advance', percentage: 40 }, { label: 'Milestone', percentage: 30 }, { label: 'Final', percentage: 30 }]);
      setShowProjBreakdown(false);
      await loadData();
    } catch (err: any) {
      showToast(`Error creating project: ${err.message || 'Database error'}`);
    } finally {
      setCreating(false);
    }
  };

  const handleAdvanceStage = async (project: DigitalProjectRecord) => {
    const currentIndex = stages.indexOf(project.status);
    if (currentIndex < stages.length - 1) {
      const nextStage = stages[currentIndex + 1];
      try {
        const updated = await advanceDigitalProjectStage(
          project.id,
          nextStage,
          profile?.full_name || 'Digital Lead',
          `Milestone advanced to ${nextStage}`
        );
        if (updated) {
          showToast(`Project advanced to stage: ${nextStage}`);
          await loadData();
        }
      } catch (err: any) {
        showToast(`Could not advance the project: ${err.message}`);
      }
    }
  };

  const handleAddDeliverable = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProject || !newDeliv.title.trim() || !newDeliv.url.trim()) return;

    try {
      await addDigitalDeliverable(selectedProject.id, {
        title: newDeliv.title,
        type: newDeliv.type,
        url: newDeliv.url,
        notes: newDeliv.notes,
        status: 'Submitted'
      });
      setShowDeliverableModal(false);
      setNewDeliv({ title: '', type: 'Figma', url: '', notes: '', status: 'Submitted' });
      showToast('Deliverable attached. It now waits for admin approval.');
      await loadData();
    } catch (err: any) {
      showToast(`Could not attach the deliverable: ${err.message}`);
    }
  };

  const handleReviewDeliverable = async (delivId: string, status: 'Approved' | 'Submitted') => {
    if (!selectedProject) return;
    try {
      await reviewDigitalDeliverable(selectedProject.id, delivId, status);
      showToast(status === 'Approved' ? 'Deliverable approved.' : 'Deliverable moved back to review.');
      await loadData();
    } catch (err: any) {
      showToast(`Could not update the deliverable: ${err.message}`);
    }
  };

  const handleDeleteDeliverable = async (delivId: string) => {
    if (!selectedProject) return;
    try {
      await deleteDigitalDeliverable(selectedProject.id, delivId);
      showToast('Deliverable removed');
      await loadData();
    } catch (err: any) {
      showToast(`Could not remove the deliverable: ${err.message}`);
    }
  };

  const handleDeleteProject = async (id: string, title: string) => {
    if (!window.confirm(`Delete "${title}"? The project and its tasks are removed from the portfolio. A project with payments recorded cannot be deleted until they are refunded.`)) return;
    try {
      await deleteDigitalProject(id);
      if (selectedProject?.id === id) setSelectedProject(null);
      showToast(`Project "${title}" deleted.`);
      await loadData();
    } catch (err: any) {
      showToast(`Could not delete the project: ${err.message}`);
    }
  };

  const handleConfirmReassign = async () => {
    if (!reassignProject || !reassignStaffName) return;
    try {
      const staffMember = staffList.find(s => s.id === reassignStaffName);
      if (!staffMember) { showToast('Choose a team member from the list.'); return; }
      await reassignDigitalProject(reassignProject.id, staffMember.name, staffMember.email, staffMember.id);
      showToast(`Reassigned "${reassignProject.title}" to ${staffMember.name}`);
      setReassignProject(null);
      await loadData();
    } catch (err: any) {
      showToast(`Failed to reassign: ${err.message}`);
    }
  };

  // Filtering
  const filteredProjects = projects.filter(p => {
    const isInternal = p.client_type === 'Internal' || (p.client_name || '').toLowerCase().includes('ferex') || (p.client_name || '').toLowerCase().includes('rimi');
    const matchType = clientTypeFilter === 'All' || (clientTypeFilter === 'Internal' ? isInternal : !isInternal);
    const matchStage = stageFilter === 'All' || p.status === stageFilter;
    const matchSearch =
      (p.title || '').toLowerCase().includes(search.toLowerCase()) ||
      (p.client_name || '').toLowerCase().includes(search.toLowerCase()) ||
      (p.assigned_staff_name || '').toLowerCase().includes(search.toLowerCase()) ||
      (p.service_category || '').toLowerCase().includes(search.toLowerCase());

    // The database already limits what a team member can see; "mine" means assigned to me, by account id or email.
    const isMine = Boolean(
      (profile?.id && p.assigned_staff_id === profile.id) ||
      (profile?.email && (p.assigned_staff_email || '').toLowerCase() === profile.email.toLowerCase())
    );

    // Strict staff isolation: Staff only sees their assigned projects
    if (!canViewAllCRM && !isMine) {
      return false;
    }

    let matchStaff = true;
    if (myProjectsOnly) {
      matchStaff = isMine;
    }

    return matchType && matchStage && matchSearch && matchStaff;
  });

  useEffect(() => {
    setCurrentPage(1);
  }, [clientTypeFilter, stageFilter, search, myProjectsOnly]);

  const totalPages = Math.ceil(filteredProjects.length / pageSize) || 1;
  const paginatedProjects = filteredProjects.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const getStageColor = (stage: DigitalProjectStage) => {
    switch (stage) {
      case 'Briefing': return 'bg-amber-50 text-amber-700 border-amber-200';
      case 'In Progress': return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'Review': return 'bg-purple-50 text-purple-700 border-purple-200';
      case 'Revisions': return 'bg-rose-50 text-rose-700 border-rose-200';
      case 'Delivered': return 'bg-teal-50 text-teal-700 border-teal-200';
      case 'Closed': return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      default: return 'bg-slate-50 text-slate-700 border-slate-200';
    }
  };

  return (
    <div className="space-y-6 text-left antialiased">
      {/* Toast Notification */}
      <ToastNotification message={toast} onClose={() => setToast('')} />

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <FolderKanban className="w-5 h-5 text-[#58051E]" /> Projects
          </h1>
          <p className="text-xs font-semibold text-slate-500 mt-1">
            Client work from briefing to delivery, with owners, deliverables and billing.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            className="bg-[#58051E] hover:bg-[#430316] text-xs font-bold shadow-sm"
            onClick={() => setShowAddModal(true)}
          >
            <Plus className="w-4 h-4 mr-1.5" /> New project
          </Button>
        </div>
      </div>

      {/* Control Bar & Filters */}
      <Card className="p-4 border border-slate-200/80 shadow-xs space-y-3">
        <div className="flex flex-col lg:flex-row items-center justify-between gap-3">
          {/* Search Box */}
          <div className="relative w-full lg:w-80">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search title, client, staff or deliverables..."
              className="w-full h-9 pl-9 pr-4 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:bg-white focus:outline-none focus:border-[#58051E]"
            />
          </div>

          {/* Client Type Selector */}
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl w-full lg:w-auto">
            {(['All', 'Internal', 'External'] as const).map((type) => (
              <button
                key={type}
                onClick={() => setClientTypeFilter(type)}
                className={`flex-1 lg:flex-none px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  clientTypeFilter === type
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                {type === 'Internal' ? 'Internal (Ferex)' : type === 'External' ? 'External Clients' : 'All Clients'}
              </button>
            ))}
          </div>

          {/* Staff Projects Only Toggle */}
          <div className="flex items-center gap-2">
            <label className="flex items-center gap-1.5 text-xs font-bold text-slate-600 cursor-pointer">
              <input
                type="checkbox"
                checked={myProjectsOnly}
                onChange={(e) => setMyProjectsOnly(e.target.checked)}
                className="rounded border-slate-300 text-[#58051E] focus:ring-[#58051E]"
              />
              <span>Assigned To Me Only</span>
            </label>
            <span className="text-xs font-bold text-slate-400 pl-2 border-l border-slate-200">
              {filteredProjects.length} Projects
            </span>
          </div>
        </div>

        {/* Stage Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 pt-1 scrollbar-thin">
          <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider shrink-0 mr-1">
            Stage:
          </span>
          <button
            onClick={() => setStageFilter('All')}
            className={`px-2.5 py-1 rounded-lg text-[11px] font-bold shrink-0 transition-colors ${
              stageFilter === 'All'
                ? 'bg-[#58051E] text-white'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            All Stages
          </button>
          {stages.map((st) => (
            <button
              key={st}
              onClick={() => setStageFilter(st)}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-bold shrink-0 transition-colors ${
                stageFilter === st
                  ? 'bg-[#58051E] text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {st}
            </button>
          ))}
        </div>
      </Card>

      {/* Projects Grid */}
      {loading ? (
        <div className="p-12 text-center text-xs font-bold text-slate-400">Loading digital projects...</div>
      ) : filteredProjects.length === 0 ? (
        <Card className="p-12 text-center border-dashed border-2 border-slate-200">
          <FolderKanban className="w-10 h-10 text-slate-300 mx-auto mb-2" />
          <p className="text-xs font-bold text-slate-500">No matching projects found.</p>
        </Card>
      ) : (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {paginatedProjects.map((p) => {
              const isInternal = p.client_type === 'Internal';
              const isFinished = p.status === 'Delivered' || p.status === 'Closed';

              return (
                <Card
                  key={p.id}
                  className="p-5 border border-slate-200/80 shadow-xs hover:border-[#58051E]/40 hover:shadow-md transition-all flex flex-col justify-between space-y-4"
                >
                  <div className="space-y-3">
                    {/* Client Type & Status Header */}
                    <div className="flex items-center justify-between gap-2">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider flex items-center gap-1 ${
                          isInternal
                            ? 'bg-blue-50 text-blue-700 border border-blue-200'
                            : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                        }`}
                      >
                        {isInternal ? <Building2 className="w-3 h-3" /> : <Globe2 className="w-3 h-3" />}
                        {isInternal ? 'Internal Division' : 'External Client'}
                      </span>

                      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold border ${getStageColor(p.status)}`}>
                        {p.status}
                      </span>
                    </div>

                    {/* Title & Scope with inline editing */}
                    <div>
                      {editingTitleId === p.id ? (
                        <input
                          type="text"
                          autoFocus
                          value={editingTitleVal}
                          onChange={(e) => setEditingTitleVal(e.target.value)}
                          onBlur={async () => {
                            if (editingTitleVal.trim() && editingTitleVal !== p.title) {
                              try {
                                await updateDigitalProject(p.id, { title: editingTitleVal.trim() });
                                showToast(`Project title updated to "${editingTitleVal.trim()}"`);
                                await loadData();
                              } catch (err: any) {
                                showToast(`Could not rename the project: ${err.message}`);
                              }
                            }
                            setEditingTitleId(null);
                          }}
                          onKeyDown={async (e) => {
                            if (e.key === 'Enter') {
                              if (editingTitleVal.trim() && editingTitleVal !== p.title) {
                                try {
                                  await updateDigitalProject(p.id, { title: editingTitleVal.trim() });
                                  showToast(`Project title updated to "${editingTitleVal.trim()}"`);
                                  await loadData();
                                } catch (err: any) {
                                  showToast(`Could not rename the project: ${err.message}`);
                                }
                              }
                              setEditingTitleId(null);
                            } else if (e.key === 'Escape') {
                              setEditingTitleId(null);
                            }
                          }}
                          className="w-full text-base font-black text-slate-900 border border-[#58051E] rounded px-2 py-0.5 focus:outline-hidden"
                        />
                      ) : (
                        <div className="flex items-center justify-between group/title gap-1">
                          <h3
                            onClick={() => setSelectedProject(p)}
                            className="text-base font-black text-slate-900 leading-snug hover:text-[#58051E] cursor-pointer transition-colors line-clamp-2"
                            title={p.title}
                          >
                            {p.title}
                          </h3>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setEditingTitleId(p.id);
                              setEditingTitleVal(p.title);
                            }}
                            className="opacity-0 group-hover/title:opacity-100 p-1 text-slate-400 hover:text-slate-700 transition-opacity"
                            title="Click to edit title"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      )}
                      <p className="text-xs font-bold text-slate-500 mt-0.5 truncate">
                        {p.client_name || 'Ferex Division Account'}
                      </p>
                      {p.scope && (
                        <p className="text-[11px] text-slate-600 line-clamp-2 mt-1.5 bg-slate-50 p-2 rounded-lg border border-slate-100">
                          {p.scope}
                        </p>
                      )}
                    </div>

                    {/* Stage Visual Indicator */}
                    <div className="space-y-1 pt-1">
                      <div className="flex justify-between text-[11px] font-bold text-slate-600">
                        <span>Workflow Stage</span>
                        <span className="text-[#58051E] font-black">{p.status}</span>
                      </div>
                      <div className="grid grid-cols-6 gap-1 h-2">
                        {stages.map((st, i) => {
                          const currentIdx = stages.indexOf(p.status);
                          const isReached = i <= currentIdx;
                          return (
                            <div
                              key={st}
                              className={`rounded-full transition-all ${
                                isReached ? 'bg-[#58051E]' : 'bg-slate-200'
                              }`}
                              title={`${st} (Step ${i + 1})`}
                            />
                          );
                        })}
                      </div>
                    </div>

                    {/* Meta Details */}
                    <div className="pt-2 border-t border-slate-100 space-y-1.5">
                      <div className="flex justify-between items-center text-xs">
                        <span className="text-slate-400 font-semibold">Service:</span>
                        <span className="font-bold text-slate-700 truncate max-w-[170px]">
                          {p.service_category || 'Marketing'}
                        </span>
                      </div>
                      <div className="flex justify-between items-center text-xs">
                        <span className="text-slate-400 font-semibold">Assigned Staff:</span>
                        <span className="font-bold text-slate-900 flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                          {p.assigned_staff_name}
                        </span>
                      </div>
                      <div className="flex justify-between items-center text-xs">
                        <span className="text-slate-400 font-semibold">Deadline:</span>
                        <span className={`font-bold ${
                          new Date(p.deadline).getTime() < Date.now() && !isFinished
                            ? 'text-rose-600'
                            : 'text-slate-700'
                        }`}>
                          {p.deadline ? new Date(p.deadline).toLocaleDateString() : 'TBD'}
                        </span>
                      </div>
                      <div className="flex justify-between items-center text-[11px] pt-1 border-t border-slate-200/60">
                        <span className="text-slate-400">Deliverables Attached:</span>
                        <span className="font-extrabold text-[#58051E] flex items-center gap-1">
                          <Paperclip className="w-3 h-3" /> {(p.deliverables || []).length} items
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Actions Footer */}
                  <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      className="flex-1 text-xs font-bold"
                      onClick={() => setSelectedProject(p)}
                    >
                      <Layers className="w-3.5 h-3.5 mr-1 text-[#58051E]" /> Deliverables ({ (p.deliverables || []).length })
                    </Button>

                    {(isAdmin || isCentral) && (
                      <button
                        onClick={() => {
                          setReassignProject(p);
                          setReassignStaffName(p.assigned_staff_id || '');
                        }}
                        className="px-2.5 py-1.5 bg-slate-100 hover:bg-[#58051E]/10 text-slate-700 hover:text-[#58051E] rounded-lg text-xs font-bold border border-slate-200 transition-colors cursor-pointer shrink-0"
                        title="Reassign Project Manager / Lead"
                      >
                        <UserCheck className="w-3.5 h-3.5 inline mr-1 text-[#58051E]" />
                        <span>Reassign PM</span>
                      </button>
                    )}

                    {(() => {
                      const canAdvance = isAdmin || isCentral || Boolean(
                        (profile?.id && p.assigned_staff_id === profile.id) ||
                        (profile?.email && (p.assigned_staff_email || '').toLowerCase() === profile.email.toLowerCase())
                      );

                      return !isFinished ? (
                        <Button
                          size="sm"
                          disabled={!canAdvance}
                          className={`bg-[#58051E] hover:bg-[#430316] text-xs font-bold px-2.5 ${!canAdvance ? 'opacity-60 cursor-not-allowed' : ''}`}
                          onClick={() => {
                            if (canAdvance) handleAdvanceStage(p);
                          }}
                          title={canAdvance ? 'Advance to Next Stage' : 'Only assigned staff or admin can advance stage'}
                        >
                          <span>Next</span>
                          <ChevronRight className="w-3.5 h-3.5 ml-0.5" />
                        </Button>
                      ) : (
                        <span className="px-2 py-1 bg-emerald-100 text-emerald-800 rounded text-[10px] font-extrabold">
                          Completed
                        </span>
                      );
                    })()}

                    {/* Delete Project Option (Always available on card) */}
                    <button
                      onClick={() => handleDeleteProject(p.id, p.title)}
                      className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors border border-transparent hover:border-rose-200 shrink-0"
                      title="Delete Project from Portfolio"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </Card>
              );
            })}
          </div>

          {/* ── 10 / 25 / 50 Pagination Controls ── */}
          <div className="p-3.5 bg-white border border-slate-200/80 rounded-2xl shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2 text-slate-500 font-medium">
              <span>Show</span>
              <select
                value={pageSize}
                onChange={(e) => {
                  setPageSize(Number(e.target.value));
                  setCurrentPage(1);
                }}
                className="bg-slate-50 border border-slate-200 rounded px-2 py-1 font-bold text-slate-700 focus:outline-hidden"
              >
                <option value={10}>10</option>
                <option value={25}>25</option>
                <option value={50}>50</option>
              </select>
              <span>projects per page</span>
              <span className="text-slate-300">|</span>
              <span>
                Showing {filteredProjects.length === 0 ? 0 : (currentPage - 1) * pageSize + 1} to{' '}
                {Math.min(currentPage * pageSize, filteredProjects.length)} of {filteredProjects.length} projects
              </span>
            </div>

            <div className="flex items-center gap-1.5">
              <Button
                variant="outline"
                size="sm"
                disabled={currentPage <= 1}
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                className="px-2.5 py-1 text-xs"
              >
                Previous
              </Button>
              <div className="px-3 py-1 font-bold text-slate-700 bg-slate-50 border border-slate-200 rounded text-xs">
                Page {currentPage} of {totalPages}
              </div>
              <Button
                variant="outline"
                size="sm"
                disabled={currentPage >= totalPages}
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                className="px-2.5 py-1 text-xs"
              >
                Next
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ── PROJECT DETAILS & DELIVERABLES DRAWER ── */}
      <AnimatePresence>
        {selectedProject && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.4 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-slate-900 z-40"
              onClick={() => setSelectedProject(null)}
            />
            <motion.div
              initial={{ translateX: '100%' }}
              animate={{ translateX: 0 }}
              exit={{ translateX: '100%' }}
              transition={{ duration: 0.25 }}
              className="fixed top-0 right-0 h-screen w-full max-w-xl bg-white z-50 shadow-2xl p-6 overflow-y-auto space-y-6 text-left"
            >
              <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                <div>
                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-black uppercase ${
                      selectedProject.client_type === 'Internal'
                        ? 'bg-blue-50 text-blue-700'
                        : 'bg-emerald-50 text-emerald-700'
                    }`}
                  >
                    {selectedProject.client_type === 'Internal' ? 'Internal Division' : 'External Client'}
                  </span>
                  <h2 className="text-lg font-black text-slate-900 mt-1">{selectedProject.title}</h2>
                  <p className="text-xs font-semibold text-slate-500">{selectedProject.client_name}</p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleDeleteProject(selectedProject.id, selectedProject.title)}
                    className="px-2.5 py-1.5 text-xs font-bold text-rose-600 bg-rose-50 hover:bg-rose-100 rounded-lg flex items-center gap-1.5 transition-colors border border-rose-200"
                    title="Delete Project from Portfolio"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Delete Project</span>
                  </button>
                  <button
                    onClick={() => setSelectedProject(null)}
                    className="p-2 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* 6-Stage Progress Steps */}
              <div className="space-y-2">
                <h4 className="text-xs font-black uppercase tracking-wider text-slate-400">
                  Project Lifecycle (6 Stages)
                </h4>
                <div className="grid grid-cols-3 gap-2">
                  {stages.map((st: string, i: number) => {
                    const currentIdx = stages.indexOf(selectedProject.status);
                    const isPassed = i < currentIdx;
                    const isCurrent = i === currentIdx;

                    return (
                      <button
                        key={st}
                        onClick={async () => {
                          try {
                            const updated = await advanceDigitalProjectStage(
                              selectedProject.id,
                              st,
                              profile?.full_name || 'Admin'
                            );
                            if (updated) setSelectedProject(updated);
                            await loadData();
                          } catch (err: any) {
                            showToast(`Could not change the stage: ${err.message}`);
                          }
                        }}
                        className={`p-2 rounded-xl text-left border text-xs transition-all ${
                          isCurrent
                            ? 'bg-[#58051E] text-white border-[#58051E] shadow-sm'
                            : isPassed
                            ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                            : 'bg-slate-50 text-slate-500 border-slate-200 hover:border-slate-300'
                        }`}
                      >
                        <div className="text-[10px] opacity-70 font-mono">Stage 0{i + 1}</div>
                        <div className="font-bold truncate">{st}</div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Scope & Description */}
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 space-y-2">
                <h4 className="text-xs font-bold text-slate-700">Project Scope & Specs</h4>
                <p className="text-xs text-slate-600 whitespace-pre-wrap leading-relaxed">
                  {selectedProject.scope || 'No specific scope text logged.'}
                </p>
                <div className="pt-2 flex flex-wrap items-center justify-between gap-3 text-xs font-bold text-slate-500 border-t border-slate-200/60">
                  <div className="flex flex-wrap gap-4">
                    <span>Start: <strong className="text-slate-800">{selectedProject.start_date || 'N/A'}</strong></span>
                    <span>Deadline: <strong className="text-slate-800">{selectedProject.deadline || 'N/A'}</strong></span>
                    <span>Staff Lead: <strong className="text-slate-800">{selectedProject.assigned_staff_name || 'Unassigned'}</strong></span>
                  </div>
                  {(isAdmin || isCentral) && (
                    <button
                      onClick={() => {
                        setReassignProject(selectedProject);
                        setReassignStaffName(selectedProject.assigned_staff_id || '');
                      }}
                      className="px-2 py-1 bg-white hover:bg-slate-100 border border-slate-300 text-slate-700 hover:text-[#58051E] rounded-md text-[11px] font-bold cursor-pointer inline-flex items-center gap-1 shadow-2xs"
                    >
                      <UserCheck className="w-3 h-3 text-[#58051E]" />
                      <span>Change PM</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Commercial Value & Milestone Payments (from the project contract) */}
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                    <DollarSign className="w-3.5 h-3.5 text-[#58051E]" /> Commercial Value & Milestone Payments
                  </h4>
                  <span className="text-xs font-black text-emerald-700">{formatDigitalCurrency(selectedProject.budget, selectedProject.currency)}</span>
                </div>
                {drawerContract ? (() => {
                  const t = trackContract(drawerContract.body);
                  const cur = drawerContract.body.currency;
                  return (
                    <div className="space-y-2">
                      <div className="flex justify-between text-[11px] font-bold text-slate-600">
                        <span>Collected {money(t.received, cur)} of {money(t.total, cur)} ({t.percent_paid}%)</span>
                        {t.overdue_count > 0 && <span className="text-rose-600">{money(t.overdue_amount, cur)} overdue</span>}
                      </div>
                      <div className="h-1.5 w-full bg-slate-200 rounded-full overflow-hidden"><div className={`h-full rounded-full ${t.overdue_count ? 'bg-rose-500' : 'bg-[#58051E]'}`} style={{ width: `${Math.min(100, t.percent_paid)}%` }} /></div>
                      <div className="space-y-1">
                        {t.terms.map(term => (
                          <div key={term.id} className="flex items-center justify-between text-[11px] bg-white rounded-lg px-2.5 py-1.5 border border-slate-100">
                            <span className="font-bold text-slate-800">{term.label}</span>
                            <span className="text-slate-500">{term.due_date}</span>
                            <span className="font-semibold text-slate-700">{money(term.received, cur)} / {money(term.amount, cur)}</span>
                            <span className={`font-extrabold ${term.status === 'Paid' ? 'text-emerald-700' : term.status === 'Overdue' ? 'text-rose-600' : term.status === 'Partially Paid' ? 'text-blue-700' : 'text-slate-500'}`}>{term.status}</span>
                          </div>
                        ))}
                      </div>
                      <Link to={`/digital/billing?project=${selectedProject.id}`} className="inline-block text-[11px] font-bold text-[#58051E] underline">Open billing: record payments, edit milestones, add extra scope</Link>
                    </div>
                  );
                })() : (
                  <div className="text-[11px] font-semibold text-slate-500">
                    {isAdmin ? <>No billing configured for this project yet. <Link to="/digital/billing" className="text-[#58051E] underline font-bold">Configure billing</Link></> : 'Billing is managed by the Digital administrators.'}
                  </div>
                )}
              </div>

              {/* Attached Deliverables Hub */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-black uppercase tracking-wider text-slate-900 flex items-center gap-1.5">
                    <Paperclip className="w-4 h-4 text-[#58051E]" /> Deliverables & Assets ({ (selectedProject.deliverables || []).length })
                  </h4>
                  <Button
                    size="sm"
                    className="bg-[#58051E] hover:bg-[#430316] text-[11px] font-bold h-7 px-2.5"
                    onClick={() => setShowDeliverableModal(true)}
                  >
                    <Plus className="w-3.5 h-3.5 mr-1" /> Attach Deliverable
                  </Button>
                </div>

                {(selectedProject.deliverables || []).length === 0 ? (
                  <div className="p-6 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-200 text-xs font-semibold text-slate-400">
                    No deliverables attached yet. Click "Attach Deliverable" to upload/link Figma, Google Drive, PDFs, or Canva assets.
                  </div>
                ) : (
                  <div className="space-y-2">
                    {(selectedProject.deliverables || []).map((d) => (
                      <div
                        key={d.id}
                        className="p-3 bg-white border border-slate-200 rounded-xl flex items-center justify-between gap-3 shadow-2xs hover:border-slate-300"
                      >
                        <div className="space-y-0.5 flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-[9px] font-black uppercase bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded">
                              {d.type}
                            </span>
                            <span className="text-xs font-bold text-slate-900 truncate">{d.title}</span>
                            <span className={`text-[9px] font-black uppercase px-1.5 py-0.5 rounded ${d.status === 'Approved' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'}`}>{d.status}</span>
                          </div>
                          {d.notes && <p className="text-[11px] text-slate-500 truncate">{d.notes}</p>}
                        </div>

                        <div className="flex items-center gap-2">
                          <a
                            href={d.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-1.5 text-[#58051E] hover:bg-[#58051E]/10 rounded-lg text-xs font-bold flex items-center gap-1"
                          >
                            <ExternalLink className="w-3.5 h-3.5" /> Open
                          </a>
                          {isAdmin && (
                            <button
                              onClick={() => handleReviewDeliverable(d.id, d.status === 'Approved' ? 'Submitted' : 'Approved')}
                              className="px-2 py-1 text-[10px] font-bold text-emerald-700 hover:bg-emerald-50 rounded-lg border border-emerald-200 cursor-pointer"
                            >
                              {d.status === 'Approved' ? 'Re-open' : 'Approve'}
                            </button>
                          )}
                          {isAdmin && (
                            <button
                              onClick={() => handleDeleteDeliverable(d.id)}
                              className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Stage Audit History */}
              {selectedProject.stage_history && selectedProject.stage_history.length > 0 && (
                <div className="space-y-2 pt-2 border-t border-slate-100">
                  <h4 className="text-xs font-black uppercase tracking-wider text-slate-400">
                    Stage Confirmation Audit Trail
                  </h4>
                  <div className="space-y-1.5">
                    {selectedProject.stage_history.map((h, i) => (
                      <div key={i} className="text-xs flex items-center justify-between p-2 bg-slate-50 rounded-lg text-slate-600">
                        <span className="font-bold text-slate-800">Stage: {h.stage}</span>
                        <span className="text-[11px] text-slate-400">{h.confirmed_by} • {h.timestamp}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* ── START NEW PROJECT MODAL ── */}
      <AnimatePresence>
        {showAddModal && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50"
              onClick={() => setShowAddModal(false)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-lg bg-white rounded-3xl shadow-2xl z-50 border border-slate-100 p-6 text-left max-h-[90vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between mb-4 pb-2 border-b border-slate-100">
                <h3 className="text-base font-black text-slate-900">Start New Digital Project</h3>
                <button onClick={() => setShowAddModal(false)} className="p-1 text-slate-400 hover:text-slate-600">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleCreateProject} className="space-y-4">
                <div>
                  <label className="block text-[10px] font-extrabold text-slate-400 uppercase mb-1">
                    Project Title *
                  </label>
                  <input
                    type="text"
                    required
                    value={newProj.title}
                    onChange={(e) => setNewProj({ ...newProj, title: e.target.value })}
                    placeholder="e.g. Q4 Regional Brand Campaign & Media Kit"
                    className="w-full h-10 px-3.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:bg-white focus:outline-none focus:border-[#58051E]"
                  />
                </div>

                {/* Client Selector with Internal/External Groups */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-extrabold text-slate-400 uppercase mb-1">
                      Client / Division *
                    </label>
                    <select
                      required
                      value={newProj.client_id}
                      onChange={(e) => {
                        const sel = clients.find(c => c.id === e.target.value);
                        setNewProj({
                          ...newProj,
                          client_id: e.target.value,
                          client_name: sel?.company_name || sel?.name || '',
                          client_type: sel?.client_type || (sel?.company_name?.toLowerCase().includes('ferex') ? 'Internal' : 'External')
                        });
                      }}
                      className="w-full h-10 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:bg-white focus:outline-none focus:border-[#58051E]"
                    >
                      <option value="">-- Select Client / Division --</option>
                      <optgroup label="Internal Ferex Subsidiaries">
                        {clients.filter(c => c.client_type === 'Internal' || (c.company_name || '').toLowerCase().includes('ferex') || (c.company_name || '').toLowerCase().includes('rimi')).map(c => (
                          <option key={c.id} value={c.id}>
                            {c.company_name || c.name}
                          </option>
                        ))}
                      </optgroup>
                      <optgroup label="External Enterprise Clients">
                        {clients.filter(c => c.client_type !== 'Internal' && !(c.company_name || '').toLowerCase().includes('ferex') && !(c.company_name || '').toLowerCase().includes('rimi')).map(c => (
                          <option key={c.id} value={c.id}>
                            {c.company_name || c.name} ({c.industry || 'External Account'})
                          </option>
                        ))}
                      </optgroup>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[10px] font-extrabold text-slate-400 uppercase mb-1">
                      Service Category
                    </label>
                    <select
                      value={newProj.service_category}
                      onChange={(e) => setNewProj({ ...newProj, service_category: e.target.value })}
                      className="w-full h-10 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:bg-white focus:outline-none focus:border-[#58051E]"
                    >
                      <option value="Web & App Development">Web Application Development (Full Stack)</option>
                      <option value="Mobile App Development">Mobile App (iOS / Android / Flutter)</option>
                      <option value="Enterprise Cloud ERP & SaaS">Cloud ERP & SaaS Architecture</option>
                      <option value="UI/UX System & Product Design">UI/UX System & Product Design</option>
                      <option value="AI / ML Copilot & Intelligent Agents">AI / ML Assistant & Intelligent Agents</option>
                      <option value="DevOps & Cloud Infrastructure">DevOps, CI/CD & Cloud Infrastructure</option>
                      <option value="Cybersecurity & Penetration Testing">Cybersecurity & Penetration Testing</option>
                      <option value="API & Database Architecture">API & Database Architecture</option>
                      <option value="Custom Enterprise Software">Custom Software Engineering</option>
                      <option value="Digital Marketing & Advertising">Digital Marketing & Performance Ads</option>
                      <option value="SEO & Growth Engineering">SEO & Growth Engineering</option>
                      <option value="Branding & Visual Identity">Branding & Corporate Identity</option>
                    </select>
                  </div>
                </div>

                {/* Scope / Description */}
                <div>
                  <label className="block text-[10px] font-extrabold text-slate-400 uppercase mb-1">
                    Scope / Deliverables Description
                  </label>
                  <textarea
                    rows={3}
                    value={newProj.scope}
                    onChange={(e) => setNewProj({ ...newProj, scope: e.target.value })}
                    placeholder="Key campaign deliverables, milestones, visual specifications..."
                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:bg-white focus:outline-none focus:border-[#58051E]"
                  />
                </div>

                {/* ── COMMERCIAL VALUE & PAYMENT TERMS CONFIGURATION ── */}
                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-3.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-extrabold uppercase tracking-wider text-[#58051E] flex items-center gap-1.5">
                      <DollarSign className="w-3.5 h-3.5 text-[#58051E]" /> Commercial & Payment Terms Configuration
                    </span>
                    <span className="text-[10px] text-slate-400 font-semibold">Single Source of Truth</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                    <div>
                      <label className="block text-[10px] font-extrabold text-slate-500 uppercase mb-1">
                        Billing country (2-letter code) *
                      </label>
                      <input
                        type="text"
                        required
                        minLength={2}
                        maxLength={2}
                        placeholder="IN, US, AE…"
                        value={newProj.country}
                        onChange={(e) => setNewProj({ ...newProj, country: e.target.value.toUpperCase() })}
                        className="w-full h-10 px-3 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:border-[#58051E]"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-extrabold text-slate-500 uppercase mb-1">
                        Currency
                      </label>
                      <select
                        value={newProj.currency}
                        onChange={(e) => setNewProj({ ...newProj, currency: e.target.value })}
                        className="w-full h-10 px-3 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:border-[#58051E]"
                      >
                        {DIGITAL_CURRENCIES.map(c => (
                          <option key={c.code} value={c.code}>
                            {c.flag} {c.code} ({c.symbol}) — {c.country}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-[10px] font-extrabold text-slate-500 uppercase mb-1">
                        Total Budget ({getCurrencySymbol(newProj.currency)}) *
                      </label>
                      <input
                        type="number"
                        required
                        min={1}
                        value={newProj.budget}
                        onChange={(e) => setNewProj({ ...newProj, budget: Number(e.target.value) })}
                        className="w-full h-10 px-3.5 bg-white border border-slate-200 rounded-xl text-xs font-black text-emerald-700 focus:outline-none focus:border-[#58051E]"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-extrabold text-slate-500 uppercase mb-1">
                        Payment Terms
                      </label>
                      <select
                        value={newProj.payment_terms}
                        onChange={(e) => {
                          const val = e.target.value;
                          let splitType: any = 'advance_30';
                          if (val.includes('100%') || val.includes('Full')) splitType = 'full';
                          else if (val.includes('50%')) splitType = 'advance_50';
                          else if (val.includes('3-Stage') || val.includes('Milestone')) splitType = 'three_milestones';
                          setNewProj({ ...newProj, payment_terms: val, payment_split_type: splitType });
                        }}
                        className="w-full h-10 px-3 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:outline-none focus:border-[#58051E]"
                      >
                        <option value="Advance Payment (30% Upfront)">Advance Payment (30% Upfront)</option>
                        <option value="Advance Payment (50% Upfront)">Advance Payment (50% Upfront)</option>
                        <option value="3-Stage Milestone Split (40% / 30% / 30%)">3-Stage Milestone Split (40% / 30% / 30%)</option>
                        <option value="Full Payment (100% Upfront)">Full Payment (100% Upfront)</option>
                      </select>
                    </div>
                  </div>

                  {/* Payment Milestone Structure Quick Selector */}
                  <div>
                    <label className="block text-[10px] font-extrabold text-slate-400 uppercase mb-1.5">
                      Milestone Structure
                    </label>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                      {[
                        { id: 'advance_30', label: '30% Advance', desc: '30% / 70%' },
                        { id: 'advance_50', label: '50% Advance', desc: '50% / 50%' },
                        { id: 'three_milestones', label: '3-Part Split', desc: '40% / 30% / 30%' },
                        { id: 'full', label: 'Full 100%', desc: 'Single Part' },
                        { id: 'custom_advance', label: 'Custom', desc: 'Define your %' },
                      ].map(opt => (
                        <button
                          key={opt.id}
                          type="button"
                          onClick={() => {
                            let terms = 'Advance Payment (30% Upfront)';
                            if (opt.id === 'advance_50') terms = 'Advance Payment (50% Upfront)';
                            else if (opt.id === 'three_milestones') terms = '3-Stage Milestone Split (40% / 30% / 30%)';
                            else if (opt.id === 'full') terms = 'Full Payment (100% Upfront)';
                            else if (opt.id === 'custom_advance') terms = 'Custom Milestone Split';
                            setNewProj({
                              ...newProj,
                              payment_split_type: opt.id as any,
                              payment_terms: terms,
                              advance_percentage: opt.id === 'advance_50' ? 50 : opt.id === 'full' ? 100 : 30
                            });
                          }}
                          className={`p-2 rounded-xl text-left border transition-all ${
                            newProj.payment_split_type === opt.id
                              ? 'bg-[#58051E] text-white border-[#58051E] shadow-xs'
                              : 'bg-white text-slate-700 border-slate-200 hover:border-slate-300'
                          }`}
                        >
                          <div className="text-[11px] font-black">{opt.label}</div>
                          <div className={`text-[9px] ${newProj.payment_split_type === opt.id ? 'text-white/70' : 'text-slate-400'}`}>
                            {opt.desc}
                          </div>
                        </button>
                      ))}
                    </div>

                    {/* Custom Milestone Part Editor */}
                    {newProj.payment_split_type === 'custom_advance' && (
                      <div className="mt-2 p-3 bg-violet-50 border border-violet-200 rounded-xl space-y-2">
                        <div className="flex items-center justify-between">
                          <p className="text-[10px] font-bold text-violet-700 uppercase">Custom Milestone Parts</p>
                          <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-lg ${
                            Math.abs(customMilestoneParts.reduce((s,p) => s + Number(p.percentage||0), 0) - 100) <= 1
                              ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'
                          }`}>
                            Total: {customMilestoneParts.reduce((s,p) => s + Number(p.percentage||0), 0)}%
                          </span>
                        </div>
                        {customMilestoneParts.map((cp, idx) => (
                          <div key={idx} className="flex items-center gap-2">
                            <input
                              type="text"
                              value={cp.label}
                              onChange={e => setCustomMilestoneParts(prev => prev.map((p, i) => i === idx ? { ...p, label: e.target.value } : p))}
                              placeholder={`Part ${idx+1} label`}
                              className="flex-1 h-8 px-2.5 bg-white border border-slate-200 rounded-lg text-xs font-semibold"
                            />
                            <input
                              type="number"
                              min={1}
                              max={99}
                              value={cp.percentage || ''}
                              onChange={e => setCustomMilestoneParts(prev => prev.map((p, i) => i === idx ? { ...p, percentage: Number(e.target.value) } : p))}
                              placeholder="%"
                              className="w-16 h-8 px-2.5 bg-white border border-slate-200 rounded-lg text-xs font-bold text-violet-700 text-center"
                            />
                            {customMilestoneParts.length > 2 && (
                              <button
                                type="button"
                                onClick={() => setCustomMilestoneParts(prev => prev.filter((_, i) => i !== idx))}
                                className="p-1 text-slate-400 hover:text-red-500"
                              >
                                <X className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        ))}
                        {customMilestoneParts.length < 5 && (
                          <button
                            type="button"
                            onClick={() => setCustomMilestoneParts(prev => [...prev, { label: `Part ${prev.length+1}`, percentage: 0 }])}
                            className="text-[10px] font-bold px-2 py-1 rounded-lg bg-violet-100 text-violet-700 hover:bg-violet-200"
                          >
                            + Add Part
                          </button>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Live Calculated Milestone Installment Cards */}
                  <div className="pt-2 border-t border-slate-200/70 space-y-1.5">
                    <span className="text-[10px] font-bold uppercase text-slate-400 block">
                      Live Payment Installments Breakdown
                    </span>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {newProj.payment_split_type === 'full' ? (
                        <div className="p-2.5 bg-white rounded-xl border border-slate-200 flex items-center justify-between sm:col-span-2">
                          <div>
                            <span className="text-[11px] font-bold text-slate-800">Part 1: Full Payment (100%)</span>
                            <span className="text-[10px] text-slate-400 block">Due on kickoff ({newProj.start_date})</span>
                          </div>
                          <span className="text-xs font-black text-emerald-700">₹{(Number(newProj.budget) || 0).toLocaleString('en-IN')}</span>
                        </div>
                      ) : newProj.payment_split_type === 'three_milestones' ? (
                        <>
                          <div className="p-2.5 bg-white rounded-xl border border-slate-200 flex items-center justify-between">
                            <div>
                              <span className="text-[11px] font-bold text-slate-800">Part 1: Kickoff (40%)</span>
                              <span className="text-[10px] text-slate-400 block">Due on start ({newProj.start_date})</span>
                            </div>
                            <span className="text-xs font-black text-emerald-700">
                              ₹{Math.round((Number(newProj.budget) || 0) * 0.4).toLocaleString('en-IN')}
                            </span>
                          </div>
                          <div className="p-2.5 bg-white rounded-xl border border-slate-200 flex items-center justify-between">
                            <div>
                              <span className="text-[11px] font-bold text-slate-800">Part 2: Milestone (30%)</span>
                              <span className="text-[10px] text-slate-400 block">Due mid-cycle</span>
                            </div>
                            <span className="text-xs font-black text-emerald-700">
                              ₹{Math.round((Number(newProj.budget) || 0) * 0.3).toLocaleString('en-IN')}
                            </span>
                          </div>
                          <div className="p-2.5 bg-white rounded-xl border border-slate-200 flex items-center justify-between sm:col-span-2">
                            <div>
                              <span className="text-[11px] font-bold text-slate-800">Part 3: Final Handover (30%)</span>
                              <span className="text-[10px] text-slate-400 block">Due on deadline ({newProj.deadline})</span>
                            </div>
                            <span className="text-xs font-black text-emerald-700">
                              ₹{((Number(newProj.budget) || 0) - Math.round((Number(newProj.budget) || 0) * 0.4) - Math.round((Number(newProj.budget) || 0) * 0.3)).toLocaleString('en-IN')}
                            </span>
                          </div>
                        </>
                      ) : newProj.payment_split_type === 'custom_advance' ? (
                        customMilestoneParts.map((cp, i) => (
                          <div key={i} className="p-2.5 bg-white rounded-xl border border-violet-200 flex items-center justify-between">
                            <div>
                              <span className="text-[11px] font-bold text-slate-800">Part {i+1}: {cp.label} ({cp.percentage}%)</span>
                              <span className="text-[10px] text-slate-400 block">{i === 0 ? `Due on start (${newProj.start_date})` : i === customMilestoneParts.length - 1 ? `Due on deadline (${newProj.deadline})` : 'Mid-cycle milestone'}</span>
                            </div>
                            <span className="text-xs font-black text-violet-700">
                              ₹{Math.round((Number(newProj.budget) || 0) * (cp.percentage / 100)).toLocaleString('en-IN')}
                            </span>
                          </div>
                        ))
                      ) : (
                        <>
                          <div className="p-2.5 bg-white rounded-xl border border-slate-200 flex items-center justify-between">
                            <div>
                              <span className="text-[11px] font-bold text-slate-800">
                                Part 1: Advance ({newProj.payment_split_type === 'advance_50' ? 50 : 30}%)
                              </span>
                              <span className="text-[10px] text-slate-400 block">Due on start ({newProj.start_date})</span>
                            </div>
                            <span className="text-xs font-black text-emerald-700">
                              ₹{Math.round((Number(newProj.budget) || 0) * (newProj.payment_split_type === 'advance_50' ? 0.5 : 0.3)).toLocaleString('en-IN')}
                            </span>
                          </div>
                          <div className="p-2.5 bg-white rounded-xl border border-slate-200 flex items-center justify-between">
                            <div>
                              <span className="text-[11px] font-bold text-slate-800">
                                Part 2: Balance ({newProj.payment_split_type === 'advance_50' ? 50 : 70}%)
                              </span>
                              <span className="text-[10px] text-slate-400 block">Due on deadline ({newProj.deadline})</span>
                            </div>
                            <span className="text-xs font-black text-emerald-700">
                              ₹{((Number(newProj.budget) || 0) - Math.round((Number(newProj.budget) || 0) * (newProj.payment_split_type === 'advance_50' ? 0.5 : 0.3))).toLocaleString('en-IN')}
                            </span>
                          </div>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Scope Cost Breakdown Section */}
                  <div className="pt-2 border-t border-slate-200/70">
                    <div className="flex items-center justify-between mb-2">
                      <label className="text-[10px] font-extrabold text-slate-400 uppercase">
                        Cost Breakdown by Component <span className="text-slate-300 font-normal">(Optional Deliverable Breakdown)</span>
                      </label>
                      <button
                        type="button"
                        onClick={() => setShowProjBreakdown(v => !v)}
                        className="text-[10px] font-bold px-2 py-1 rounded-lg bg-slate-100 text-slate-700 hover:bg-slate-200"
                      >
                        {showProjBreakdown ? 'Hide Breakdown' : '+ Add Component Breakdown'}
                      </button>
                    </div>

                    {showProjBreakdown && (
                      <div className="space-y-2 p-3 bg-blue-50/50 rounded-xl border border-blue-200">
                        <p className="text-[10px] text-blue-700 font-medium">
                          Specify deliverable component values (e.g. Design ₹3k, Frontend ₹4k, Backend ₹3k). Independent of milestone payment terms.
                        </p>
                        {projBreakdown.map((item, idx) => (
                          <div key={item.id} className="flex items-center gap-2">
                            <input
                              type="text"
                              value={item.component}
                              onChange={e => setProjBreakdown(prev => prev.map((b, i) => i === idx ? { ...b, component: e.target.value } : b))}
                              placeholder="Component (e.g. Design)"
                              className="flex-1 h-8 px-2.5 bg-white border border-slate-200 rounded-lg text-xs font-semibold"
                            />
                            <input
                              type="number"
                              min={0}
                              value={item.amount || ''}
                              onChange={e => setProjBreakdown(prev => prev.map((b, i) => i === idx ? { ...b, amount: Number(e.target.value) } : b))}
                              placeholder="₹ Amount"
                              className="w-28 h-8 px-2.5 bg-white border border-slate-200 rounded-lg text-xs font-bold text-emerald-700"
                            />
                            <button
                              type="button"
                              onClick={() => setProjBreakdown(prev => prev.filter((_, i) => i !== idx))}
                              className="p-1 text-slate-400 hover:text-red-500"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ))}
                        <div className="flex items-center justify-between pt-1">
                          <button
                            type="button"
                            onClick={() => setProjBreakdown(prev => [...prev, { id: Date.now().toString(), component: '', amount: 0 }])}
                            className="text-[10px] font-bold px-2 py-1 rounded-lg bg-blue-100 text-blue-700 hover:bg-blue-200"
                          >
                            + Add Component
                          </button>
                          <span className="text-[11px] font-bold text-slate-600">
                            Total Breakdown: ₹{projBreakdown.reduce((sum, b) => sum + Number(b.amount || 0), 0).toLocaleString('en-IN')}
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Dates & Assigned Staff */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-extrabold text-slate-400 uppercase mb-1">
                      Start Date
                    </label>
                    <input
                      type="date"
                      value={newProj.start_date}
                      onChange={(e) => setNewProj({ ...newProj, start_date: e.target.value })}
                      className="w-full h-10 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:bg-white focus:outline-none focus:border-[#58051E]"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-extrabold text-slate-400 uppercase mb-1">
                      Target Deadline
                    </label>
                    <input
                      type="date"
                      value={newProj.deadline}
                      onChange={(e) => setNewProj({ ...newProj, deadline: e.target.value })}
                      className="w-full h-10 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:bg-white focus:outline-none focus:border-[#58051E]"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-extrabold text-slate-400 uppercase mb-1">
                    Assigned Account Manager / Project Lead *
                  </label>
                  <select
                    required
                    value={newProj.assigned_staff_id}
                    onChange={(e) => setNewProj({ ...newProj, assigned_staff_id: e.target.value })}
                    className="w-full h-10 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:bg-white focus:outline-none focus:border-[#58051E]"
                  >
                    <option value="">-- Choose team member --</option>
                    {staffList.map((s: any) => (
                      <option key={s.id} value={s.id}>
                        {s.name} ({s.roleLabel || s.role || 'Account Manager'}) · {s.email}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="pt-3 flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="flex-1 text-xs font-bold"
                    onClick={() => setShowAddModal(false)}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    size="sm"
                    className="flex-1 text-xs font-bold bg-[#58051E] hover:bg-[#430316]"
                  >
                    Initiate Project
                  </Button>
                </div>
              </form>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* ── ATTACH DELIVERABLE MODAL ── */}
      <AnimatePresence>
        {showDeliverableModal && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50"
              onClick={() => setShowDeliverableModal(false)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-md bg-white rounded-3xl shadow-2xl z-50 border border-slate-100 p-6 text-left"
            >
              <div className="flex items-center justify-between mb-4 pb-2 border-b border-slate-100">
                <h3 className="text-sm font-black text-slate-900">Attach Deliverable Asset</h3>
                <button onClick={() => setShowDeliverableModal(false)} className="p-1 text-slate-400 hover:text-slate-600">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleAddDeliverable} className="space-y-3">
                <div>
                  <label className="block text-[10px] font-extrabold text-slate-400 uppercase mb-1">
                    Deliverable Title *
                  </label>
                  <input
                    type="text"
                    required
                    value={newDeliv.title}
                    onChange={(e) => setNewDeliv({ ...newDeliv, title: e.target.value })}
                    placeholder="e.g. Brand Identity Guidelines & Vector Logo Kit"
                    className="w-full h-9 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-extrabold text-slate-400 uppercase mb-1">
                      Asset Type
                    </label>
                    <select
                      value={newDeliv.type}
                      onChange={(e) => setNewDeliv({ ...newDeliv, type: e.target.value as any })}
                      className="w-full h-9 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900"
                    >
                      <option value="Figma">Figma Link</option>
                      <option value="Google Drive">Google Drive Folder</option>
                      <option value="PDF / Document">PDF / Document</option>
                      <option value="Canva / Asset">Canva / Asset</option>
                      <option value="GitHub / Code">GitHub / Code</option>
                      <option value="Video Reel">Video Reel (4K/MP4)</option>
                      <option value="Live URL">Live URL</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] font-extrabold text-slate-400 uppercase mb-1">
                      Review Status
                    </label>
                    <select
                      value={newDeliv.status}
                      onChange={(e) => setNewDeliv({ ...newDeliv, status: e.target.value as any })}
                      className="w-full h-9 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900"
                    >
                      <option value="Draft">Draft</option>
                      <option value="Submitted">Submitted for Review</option>
                      <option value="Approved">Approved</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-extrabold text-slate-400 uppercase mb-1">
                    Resource URL / Cloud Link *
                  </label>
                  <input
                    type="url"
                    required
                    value={newDeliv.url}
                    onChange={(e) => setNewDeliv({ ...newDeliv, url: e.target.value })}
                    placeholder="https://www.figma.com/... or https://drive.google.com/..."
                    className="w-full h-9 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-extrabold text-slate-400 uppercase mb-1">
                    Notes / Version Info
                  </label>
                  <input
                    type="text"
                    value={newDeliv.notes}
                    onChange={(e) => setNewDeliv({ ...newDeliv, notes: e.target.value })}
                    placeholder="e.g. Version 2.1 incorporating revisions"
                    className="w-full h-9 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900"
                  />
                </div>

                <div className="pt-2 flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="flex-1 text-xs font-bold"
                    onClick={() => setShowDeliverableModal(false)}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    size="sm"
                    className="flex-1 text-xs font-bold bg-[#58051E] hover:bg-[#430316]"
                  >
                    Attach Deliverable
                  </Button>
                </div>
              </form>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* ── REASSIGN PM MODAL ── */}
      <AnimatePresence>
        {reassignProject && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-50"
              onClick={() => setReassignProject(null)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-md bg-white rounded-3xl shadow-2xl z-50 border border-slate-100 p-6 text-left space-y-4"
            >
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div>
                  <h3 className="text-sm font-black text-slate-900 flex items-center gap-1.5">
                    <UserCheck className="w-4 h-4 text-[#58051E]" />
                    <span>Reassign Project Lead / PM</span>
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5 truncate max-w-xs">{reassignProject.title}</p>
                </div>
                <button
                  onClick={() => setReassignProject(null)}
                  className="p-1 rounded-lg text-slate-400 hover:text-slate-600 cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-3">
                <div className="text-xs text-slate-600">
                  Select a Digital Project Manager or Developer to assign this project to. The project will immediately appear in their workspace and task queue.
                </div>

                <div>
                  <label className="block text-[10px] font-extrabold text-slate-400 uppercase mb-1">
                    Select Account Manager / Project Lead *
                  </label>
                  <select
                    value={reassignStaffName}
                    onChange={(e) => setReassignStaffName(e.target.value)}
                    className="w-full h-10 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:bg-white focus:outline-none focus:border-[#58051E]"
                  >
                    <option value="">-- Choose Staff Member --</option>
                    {staffList.map((s: any) => (
                      <option key={s.id} value={s.id}>
                        {s.name} ({s.roleLabel || s.role || 'Project Lead'}) - {s.email}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="pt-2 flex gap-2 border-t border-slate-100">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="flex-1 text-xs font-bold"
                  onClick={() => setReassignProject(null)}
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  size="sm"
                  disabled={!reassignStaffName}
                  className="flex-1 text-xs font-bold bg-[#58051E] hover:bg-[#430316]"
                  onClick={handleConfirmReassign}
                >
                  Confirm Reassign
                </Button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};

