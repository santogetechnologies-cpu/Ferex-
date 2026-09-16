import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FolderKanban, Search, Plus, X, CheckCircle2, Trash2,
  ExternalLink, Paperclip, ChevronRight, Layers,
  Building2, Globe2
} from 'lucide-react';
import { Card } from '../../components/Card';
import { Button } from '../../components/Button';
import { supabase } from '../../lib/supabase';
import {
  getDigitalProjects,
  createDigitalProject,
  deleteDigitalProject,
  advanceDigitalProjectStage,
  addDigitalDeliverable,
  deleteDigitalDeliverable,
  getDigitalClients,
  type DigitalProjectRecord,
  type DigitalProjectStage,
  type DigitalDeliverable
} from '../../lib/api/digital';
import { useAuth } from '../../contexts/AuthContext';

const STAGES: DigitalProjectStage[] = ['Briefing', 'In Progress', 'Review', 'Revisions', 'Delivered', 'Closed'];

export const DigitalProjects: React.FC = () => {
  const { profile } = useAuth();
  const [projects, setProjects] = useState<DigitalProjectRecord[]>([]);
  const [clients, setClients] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [clientTypeFilter, setClientTypeFilter] = useState<'All' | 'Internal' | 'External'>('All');
  const [stageFilter, setStageFilter] = useState<string>('All');
  const [myProjectsOnly, setMyProjectsOnly] = useState(false);

  // Modals & Drawers
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedProject, setSelectedProject] = useState<DigitalProjectRecord | null>(null);
  const [showDeliverableModal, setShowDeliverableModal] = useState(false);
  const [toast, setToast] = useState('');

  // New Project Form State
  const [newProj, setNewProj] = useState({
    title: '',
    client_id: '',
    client_name: '',
    client_type: 'Internal' as 'Internal' | 'External',
    scope: '',
    service_category: 'Digital Marketing & Advertising',
    budget: 500000,
    payment_terms: 'Advance Payment' as 'Advance Payment' | 'Milestone-Based' | 'Full Payment',
    start_date: new Date().toISOString().split('T')[0],
    deadline: new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0],
    assigned_staff_name: 'Kavita Iyer',
    assigned_staff_email: 'kavita.iyer@ferex.com',
    status: 'Briefing' as DigitalProjectStage,
  });

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
      const [projData, clientData] = await Promise.all([
        getDigitalProjects(),
        getDigitalClients()
      ]);
      setClients(clientData || []);
      setProjects(projData || []);
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

    return () => {
      supabase.removeChannel(channel);
      window.removeEventListener('ferex_digital_projects_change', handleLocalChange);
    };
  }, [loadData]);

  // Keep selected project in sync
  useEffect(() => {
    if (selectedProject) {
      const fresh = projects.find(p => p.id === selectedProject.id);
      if (fresh) setSelectedProject(fresh);
    }
  }, [projects, selectedProject]);

  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProj.title.trim()) return;

    let selectedClient = clients.find(c => c.id === newProj.client_id);
    if (!selectedClient && clients.length > 0) {
      selectedClient = clients[0];
    }

    const created = await createDigitalProject({
      title: newProj.title,
      client_id: selectedClient?.id || undefined,
      client_name: selectedClient?.company_name || newProj.client_name || 'Ferex Division',
      client_type: selectedClient?.client_type || newProj.client_type,
      scope: newProj.scope,
      description: newProj.scope,
      service_category: newProj.service_category,
      budget: Number(newProj.budget) || 0,
      payment_terms: newProj.payment_terms,
      start_date: newProj.start_date,
      deadline: newProj.deadline,
      assigned_staff_name: newProj.assigned_staff_name,
      assigned_staff_email: newProj.assigned_staff_email,
      status: newProj.status,
    });

    setShowAddModal(false);
    showToast(`Created project "${created.title}" at stage: ${created.status}`);
    setNewProj({
      title: '',
      client_id: '',
      client_name: '',
      client_type: 'Internal',
      scope: '',
      service_category: 'Digital Marketing & Advertising',
      budget: 500000,
      payment_terms: 'Advance Payment',
      start_date: new Date().toISOString().split('T')[0],
      deadline: new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0],
      assigned_staff_name: 'Kavita Iyer',
      assigned_staff_email: 'kavita.iyer@ferex.com',
      status: 'Briefing',
    });
    await loadData();
  };

  const handleAdvanceStage = async (project: DigitalProjectRecord) => {
    const currentIndex = STAGES.indexOf(project.status);
    if (currentIndex < STAGES.length - 1) {
      const nextStage = STAGES[currentIndex + 1];
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
    }
  };

  const handleAddDeliverable = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProject || !newDeliv.title.trim() || !newDeliv.url.trim()) return;

    await addDigitalDeliverable(selectedProject.id, {
      title: newDeliv.title,
      type: newDeliv.type,
      url: newDeliv.url,
      notes: newDeliv.notes,
      status: newDeliv.status
    });

    setShowDeliverableModal(false);
    setNewDeliv({ title: '', type: 'Figma', url: '', notes: '', status: 'Submitted' });
    showToast('Deliverable attached to project!');
    await loadData();
  };

  const handleDeleteDeliverable = async (delivId: string) => {
    if (!selectedProject) return;
    await deleteDigitalDeliverable(selectedProject.id, delivId);
    showToast('Deliverable removed');
    await loadData();
  };

  const handleDeleteProject = async (id: string, title: string) => {
    if (!window.confirm(`Are you sure you want to delete "${title}"?`)) return;
    await deleteDigitalProject(id);
    if (selectedProject?.id === id) setSelectedProject(null);
    showToast(`Removed project ${title}`);
    await loadData();
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

    const staffName = profile?.full_name || '';
    const matchStaff = !myProjectsOnly || !staffName || (p.assigned_staff_name || '').toLowerCase().includes(staffName.toLowerCase());

    return matchType && matchStage && matchSearch && matchStaff;
  });

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
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed top-20 right-8 z-50 bg-[#58051E] text-white text-xs font-bold px-4 py-2.5 rounded-xl shadow-xl flex items-center gap-2 border border-white/20"
          >
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            {toast}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <FolderKanban className="w-5 h-5 text-[#58051E]" /> Marketing & Advertising Projects Portfolio
          </h1>
          <p className="text-xs font-semibold text-slate-500 mt-1">
            Ferex Digital Agency • 6-Stage Lifecycle Tracker (Briefing → Closed), Deliverables Hub, and Staff Assignments.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            className="bg-[#58051E] hover:bg-[#430316] text-xs font-bold shadow-sm"
            onClick={() => setShowAddModal(true)}
          >
            <Plus className="w-4 h-4 mr-1.5" /> Start New Project
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
          {STAGES.map((st) => (
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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredProjects.map((p) => {
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

                  {/* Title & Scope */}
                  <div>
                    <h3
                      onClick={() => setSelectedProject(p)}
                      className="text-base font-black text-slate-900 leading-snug hover:text-[#58051E] cursor-pointer transition-colors line-clamp-2"
                      title={p.title}
                    >
                      {p.title}
                    </h3>
                    <p className="text-xs font-bold text-slate-500 mt-0.5 truncate">
                      {p.client_name || 'Ferex Division Account'}
                    </p>
                    {p.scope && (
                      <p className="text-[11px] text-slate-600 line-clamp-2 mt-1.5 bg-slate-50 p-2 rounded-lg border border-slate-100">
                        {p.scope}
                      </p>
                    )}
                  </div>

                  {/* 6-Stage Visual Indicator */}
                  <div className="space-y-1 pt-1">
                    <div className="flex justify-between text-[11px] font-bold text-slate-600">
                      <span>Workflow Stage</span>
                      <span className="text-[#58051E] font-black">{p.status}</span>
                    </div>
                    <div className="grid grid-cols-6 gap-1 h-2">
                      {STAGES.map((st, i) => {
                        const currentIdx = STAGES.indexOf(p.status);
                        const isReached = i <= currentIdx;
                        return (
                          <div
                            key={st}
                            title={st}
                            className={`rounded-full transition-all duration-300 ${
                              isReached ? 'bg-[#58051E]' : 'bg-slate-200'
                            }`}
                          />
                        );
                      })}
                    </div>
                  </div>

                  {/* Project Details Pill */}
                  <div className="p-3 bg-slate-50/80 rounded-xl space-y-1.5 text-xs text-slate-600 border border-slate-100">
                    <div className="flex justify-between items-center font-bold">
                      <span className="text-slate-400">Budget & Terms:</span>
                      <span className="text-slate-900">
                        ₹{Number(p.budget || 0).toLocaleString('en-IN')}{' '}
                        <span className="text-[10px] font-normal text-slate-500">({p.payment_terms || 'Advance'})</span>
                      </span>
                    </div>
                    <div className="flex justify-between items-center text-[11px]">
                      <span className="text-slate-400">Assigned Staff:</span>
                      <span className="font-semibold text-slate-800">{p.assigned_staff_name || 'Kavita Iyer'}</span>
                    </div>
                    <div className="flex justify-between items-center text-[11px]">
                      <span className="text-slate-400">Target Deadline:</span>
                      <span className="font-mono text-slate-700">{p.deadline || 'Ongoing'}</span>
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

                  {!isFinished ? (
                    <Button
                      size="sm"
                      className="bg-[#58051E] hover:bg-[#430316] text-xs font-bold px-2.5"
                      onClick={() => handleAdvanceStage(p)}
                      title="Advance to Next Stage"
                    >
                      <span>Next</span>
                      <ChevronRight className="w-3.5 h-3.5 ml-0.5" />
                    </Button>
                  ) : (
                    <span className="px-2 py-1 bg-emerald-100 text-emerald-800 rounded text-[10px] font-extrabold">
                      Completed
                    </span>
                  )}

                  <button
                    onClick={() => handleDeleteProject(p.id, p.title)}
                    className="p-1.5 text-slate-400 hover:text-rose-600 rounded transition-colors"
                    title="Delete Project"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </Card>
            );
          })}
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
                <button
                  onClick={() => setSelectedProject(null)}
                  className="p-2 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* 6-Stage Progress Steps */}
              <div className="space-y-2">
                <h4 className="text-xs font-black uppercase tracking-wider text-slate-400">
                  Project Lifecycle (6 Stages)
                </h4>
                <div className="grid grid-cols-3 gap-2">
                  {STAGES.map((st, i) => {
                    const currentIdx = STAGES.indexOf(selectedProject.status);
                    const isPassed = i < currentIdx;
                    const isCurrent = i === currentIdx;

                    return (
                      <button
                        key={st}
                        onClick={async () => {
                          const updated = await advanceDigitalProjectStage(
                            selectedProject.id,
                            st,
                            profile?.full_name || 'Admin'
                          );
                          if (updated) setSelectedProject(updated);
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
                <div className="pt-2 flex flex-wrap gap-4 text-xs font-bold text-slate-500 border-t border-slate-200/60">
                  <span>Start: <strong className="text-slate-800">{selectedProject.start_date || 'N/A'}</strong></span>
                  <span>Deadline: <strong className="text-slate-800">{selectedProject.deadline || 'N/A'}</strong></span>
                  <span>Staff: <strong className="text-slate-800">{selectedProject.assigned_staff_name || 'Unassigned'}</strong></span>
                </div>
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
                          <button
                            onClick={() => handleDeleteDeliverable(d.id)}
                            className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
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

                {/* Client Selector with Internal/External Tag */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-extrabold text-slate-400 uppercase mb-1">
                      Client / Division *
                    </label>
                    <select
                      value={newProj.client_id}
                      onChange={(e) => {
                        const sel = clients.find(c => c.id === e.target.value);
                        setNewProj({
                          ...newProj,
                          client_id: e.target.value,
                          client_name: sel?.company_name || '',
                          client_type: sel?.client_type || 'Internal'
                        });
                      }}
                      className="w-full h-10 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:bg-white focus:outline-none focus:border-[#58051E]"
                    >
                      <option value="">-- Select Client / Division --</option>
                      {clients.map(c => (
                        <option key={c.id} value={c.id}>
                          [{c.client_type || 'Internal'}] {c.company_name}
                        </option>
                      ))}
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
                      <option value="Digital Marketing & Advertising">Digital Marketing & Advertising</option>
                      <option value="Branding & Visual Identity">Branding & Visual Identity</option>
                      <option value="Social Media & Video Production">Social Media & Video Production</option>
                      <option value="Web & App Development">Web & App Development</option>
                      <option value="SEO & Performance PR">SEO & Performance PR</option>
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

                {/* Budget & Payment Terms */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-extrabold text-slate-400 uppercase mb-1">
                      Total Budget (₹ INR)
                    </label>
                    <input
                      type="number"
                      required
                      value={newProj.budget}
                      onChange={(e) => setNewProj({ ...newProj, budget: Number(e.target.value) })}
                      className="w-full h-10 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:bg-white focus:outline-none focus:border-[#58051E]"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-extrabold text-slate-400 uppercase mb-1">
                      Payment Terms
                    </label>
                    <select
                      value={newProj.payment_terms}
                      onChange={(e) => setNewProj({ ...newProj, payment_terms: e.target.value as any })}
                      className="w-full h-10 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:bg-white focus:outline-none focus:border-[#58051E]"
                    >
                      <option value="Advance Payment">Advance Payment (30% Upfront)</option>
                      <option value="Milestone-Based">Milestone-Based</option>
                      <option value="Full Payment">Full Payment (100%)</option>
                    </select>
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
                    Assigned Staff Lead
                  </label>
                  <select
                    value={newProj.assigned_staff_name}
                    onChange={(e) => {
                      const name = e.target.value;
                      setNewProj({
                        ...newProj,
                        assigned_staff_name: name,
                        assigned_staff_email: `${name.toLowerCase().replace(/[^a-z]/g, '')}@ferex.com`
                      });
                    }}
                    className="w-full h-10 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:bg-white focus:outline-none focus:border-[#58051E]"
                  >
                    <option value="Kavita Iyer">Kavita Iyer (Lead Creative Director)</option>
                    <option value="Rohan Verma">Rohan Verma (Visual & Brand Designer)</option>
                    <option value="Priya Nair">Priya Nair (Senior Full-Stack Lead)</option>
                    <option value="Sneha Sen">Sneha Sen (Digital PR & Media Strategist)</option>
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
    </div>
  );
};

