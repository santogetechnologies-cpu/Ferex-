import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FolderKanban, Plus, Trash2, X, CheckCircle2,
  ExternalLink, Search, Filter, Eye, Clock,
  FileCode, Palette, Video, Globe, FileText,
  Layers, ShieldCheck, AlertCircle
} from 'lucide-react';
import { Card } from '../../components/Card';
import { Button } from '../../components/Button';
import { useAuth } from '../../contexts/AuthContext';
import { useDigitalPermissions } from '../../hooks/usePermissions';
import {
  getDigitalProjects,
  addDigitalDeliverable,
  deleteDigitalDeliverable,
  type DigitalProjectRecord,
  type DigitalDeliverable
} from '../../lib/api/digital';
import { getMasters } from '../../lib/api/masters';

interface EnrichedDeliverable extends DigitalDeliverable {
  project_id: string;
  project_title: string;
  client_name: string;
  assigned_staff_name: string;
}

export const DigitalDeliverables: React.FC = () => {
  const { profile } = useAuth();
  const { isAdmin, isStaff } = useDigitalPermissions();

  const [projects, setProjects] = useState<DigitalProjectRecord[]>([]);
  const [deliverableTypes, setDeliverableTypes] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState('');

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedType, setSelectedType] = useState('All');
  const [selectedStatus, setSelectedStatus] = useState('All');
  const [selectedProject, setSelectedProject] = useState('All');

  // Modals
  const [showAddModal, setShowAddModal] = useState(false);
  const [targetProjectId, setTargetProjectId] = useState('');
  const [delivTitle, setDelivTitle] = useState('');
  const [delivType, setDelivType] = useState('Figma');
  const [delivUrl, setDelivUrl] = useState('');
  const [delivNotes, setDelivNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const showToastMsg = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(''), 3500);
  };

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const staffEmail = isStaff && !isAdmin ? (profile?.email || '') : undefined;
      const staffName = isStaff && !isAdmin ? (profile?.full_name || '') : undefined;
      const [projData, typesData] = await Promise.all([
        getDigitalProjects({
          staffEmail,
          staffName,
        }),
        getMasters('digital', 'deliverable_types')
      ]);
      setProjects(projData || []);
      setDeliverableTypes(typesData || [
        'Design Files', 'Figma Link', 'Google Drive', 'Website URL',
        'Final Assets', 'Video Reel', 'PDF / Document', 'GitHub / Code'
      ]);
    } finally {
      setLoading(false);
    }
  }, [isAdmin, isStaff, profile]);

  useEffect(() => {
    loadData();
    const handleSync = () => loadData();
    window.addEventListener('ferex_digital_projects_change', handleSync);
    return () => window.removeEventListener('ferex_digital_projects_change', handleSync);
  }, [loadData]);

  // Aggregate all deliverables across visible projects
  const allDeliverables: EnrichedDeliverable[] = projects.flatMap(p => {
    return (p.deliverables || []).map(d => ({
      ...d,
      project_id: p.id,
      project_title: p.title,
      client_name: p.client_name,
      assigned_staff_name: p.assigned_staff_name,
    }));
  });

  // Filtered deliverables
  const filteredDeliverables = allDeliverables.filter(d => {
    if (selectedType !== 'All' && !d.type.toLowerCase().includes(selectedType.toLowerCase())) return false;
    if (selectedStatus !== 'All' && d.status !== selectedStatus) return false;
    if (selectedProject !== 'All' && d.project_id !== selectedProject) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        d.title.toLowerCase().includes(q) ||
        d.project_title.toLowerCase().includes(q) ||
        d.client_name.toLowerCase().includes(q) ||
        (d.notes || '').toLowerCase().includes(q)
      );
    }
    return true;
  });

  // Handle Add Deliverable
  const handleAddDeliverable = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetProjectId || !delivTitle.trim() || !delivUrl.trim()) {
      showToastMsg('Please select a project and fill in the title and URL.');
      return;
    }

    setIsSubmitting(true);
    try {
      await addDigitalDeliverable(targetProjectId, {
        title: delivTitle.trim(),
        type: delivType as any,
        url: delivUrl.trim(),
        notes: delivNotes.trim() || undefined,
        status: 'Submitted',
      });
      showToastMsg('Deliverable uploaded & linked successfully!');
      setShowAddModal(false);
      setDelivTitle('');
      setDelivUrl('');
      setDelivNotes('');
      setTargetProjectId('');
      await loadData();
    } catch {
      showToastMsg('Failed to add deliverable.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle Delete Deliverable
  const handleDeleteDeliverable = async (projectId: string, deliverableId: string) => {
    if (!window.confirm('Are you sure you want to remove this deliverable?')) return;
    try {
      await deleteDigitalDeliverable(projectId, deliverableId);
      showToastMsg('Deliverable removed.');
      await loadData();
    } catch {
      showToastMsg('Failed to remove deliverable.');
    }
  };

  // Icon helper
  const getDeliverableIcon = (type: string) => {
    const t = type.toLowerCase();
    if (t.includes('figma') || t.includes('design') || t.includes('asset')) return Palette;
    if (t.includes('video') || t.includes('reel')) return Video;
    if (t.includes('code') || t.includes('git')) return FileCode;
    if (t.includes('url') || t.includes('web')) return Globe;
    return FileText;
  };

  // KPI calculations
  const totalCount = allDeliverables.length;
  const approvedCount = allDeliverables.filter(d => d.status === 'Approved').length;
  const submittedCount = allDeliverables.filter(d => d.status === 'Submitted').length;
  const draftCount = allDeliverables.filter(d => d.status === 'Draft').length;

  return (
    <div className="space-y-6 text-left antialiased">
      {/* Toast */}
      {toast && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-900 text-white px-5 py-3 rounded-xl shadow-2xl flex items-center gap-3 border border-slate-700 animate-fade-in text-xs font-bold">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          {toast}
        </div>
      )}

      {/* Header Banner */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-cyan-950 via-slate-900 to-indigo-950 text-white p-6 md:p-8 shadow-xl border border-cyan-800/30">
        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="text-[10px] uppercase font-black tracking-widest bg-white/15 px-3 py-1 rounded-full border border-white/20">
                Asset Vault & Production Handover
              </span>
              <span className="text-[10px] font-extrabold text-cyan-300 bg-cyan-500/20 px-2.5 py-1 rounded-full border border-cyan-400/30 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" /> Live Repository
              </span>
            </div>
            <h1 className="text-2xl md:text-3xl font-black tracking-tight">Project Deliverables & Artifacts</h1>
            <p className="text-xs md:text-sm text-white/85 max-w-2xl font-semibold">
              Centralized repository for Figma UI designs, production code repositories, media reels, and client approval deliverables.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3 shrink-0">
            <button
              onClick={() => setShowAddModal(true)}
              className="h-10 px-5 rounded-xl text-xs font-black text-slate-900 bg-cyan-400 hover:bg-cyan-300 transition-all shadow-md flex items-center gap-2 cursor-pointer"
            >
              <Plus className="w-4 h-4" /> Upload Deliverable
            </button>
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <Card className="p-5 border border-slate-200/80 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[10.5px] font-extrabold uppercase tracking-wider text-slate-400 block mb-0.5">Total Deliverables</span>
            <span className="text-2xl font-black text-slate-900">{totalCount}</span>
            <span className="block text-[10px] font-semibold text-slate-500 mt-1">Across all active projects</span>
          </div>
          <div className="w-12 h-12 rounded-xl bg-cyan-50 border border-cyan-200 flex items-center justify-center text-cyan-600">
            <FolderKanban className="w-6 h-6" />
          </div>
        </Card>

        <Card className="p-5 border border-slate-200/80 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[10.5px] font-extrabold uppercase tracking-wider text-slate-400 block mb-0.5">Approved Assets</span>
            <span className="text-2xl font-black text-emerald-600">{approvedCount}</span>
            <span className="block text-[10px] font-semibold text-slate-500 mt-1">Signed off by client</span>
          </div>
          <div className="w-12 h-12 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-600">
            <ShieldCheck className="w-6 h-6" />
          </div>
        </Card>

        <Card className="p-5 border border-slate-200/80 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[10.5px] font-extrabold uppercase tracking-wider text-slate-400 block mb-0.5">Submitted / In Review</span>
            <span className="text-2xl font-black text-amber-600">{submittedCount}</span>
            <span className="block text-[10px] font-semibold text-slate-500 mt-1">Pending client approval</span>
          </div>
          <div className="w-12 h-12 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-600">
            <Clock className="w-6 h-6" />
          </div>
        </Card>

        <Card className="p-5 border border-slate-200/80 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[10.5px] font-extrabold uppercase tracking-wider text-slate-400 block mb-0.5">Drafts</span>
            <span className="text-2xl font-black text-slate-600">{draftCount}</span>
            <span className="block text-[10px] font-semibold text-slate-500 mt-1">Internal work in progress</span>
          </div>
          <div className="w-12 h-12 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-600">
            <Layers className="w-6 h-6" />
          </div>
        </Card>
      </div>

      {/* Filter Bar */}
      <Card className="p-4 border border-slate-200/80 shadow-xs">
        <div className="flex flex-col md:flex-row items-center gap-3">
          <div className="relative flex-1 w-full">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search deliverables by name, project, client..."
              className="w-full h-10 pl-10 pr-4 rounded-xl border border-slate-200 text-xs font-semibold focus:outline-none focus:border-cyan-500"
            />
          </div>

          <div className="flex items-center gap-2 w-full md:w-auto overflow-x-auto">
            <select
              value={selectedProject}
              onChange={e => setSelectedProject(e.target.value)}
              className="h-10 px-3 rounded-xl border border-slate-200 text-xs font-semibold bg-white focus:outline-none focus:border-cyan-500"
            >
              <option value="All">All Projects</option>
              {projects.map(p => (
                <option key={p.id} value={p.id}>{p.title}</option>
              ))}
            </select>

            <select
              value={selectedStatus}
              onChange={e => setSelectedStatus(e.target.value)}
              className="h-10 px-3 rounded-xl border border-slate-200 text-xs font-semibold bg-white focus:outline-none focus:border-cyan-500"
            >
              <option value="All">All Statuses</option>
              <option value="Draft">Draft</option>
              <option value="Submitted">Submitted</option>
              <option value="Approved">Approved</option>
            </select>
          </div>
        </div>
      </Card>

      {/* Deliverables Grid */}
      {loading ? (
        <div className="py-16 text-center text-xs font-semibold text-slate-400">Loading deliverables...</div>
      ) : filteredDeliverables.length === 0 ? (
        <Card className="py-16 text-center border border-slate-200/80">
          <FolderKanban className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <h4 className="text-sm font-black text-slate-800">No deliverables found</h4>
          <p className="text-xs text-slate-400 font-semibold mt-1">
            Upload Figma files, live demo links, or code repositories to track deliverables.
          </p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredDeliverables.map((deliv) => {
            const Icon = getDeliverableIcon(deliv.type);

            return (
              <Card
                key={deliv.id}
                className="p-5 border border-slate-200/80 shadow-xs hover:border-slate-300 hover:shadow-md transition-all flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="flex items-center gap-2.5">
                      <div className="w-10 h-10 rounded-xl bg-cyan-50 text-cyan-600 border border-cyan-100 flex items-center justify-center shrink-0">
                        <Icon className="w-5 h-5" />
                      </div>
                      <div>
                        <h4 className="text-sm font-black text-slate-900 leading-snug line-clamp-1">{deliv.title}</h4>
                        <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">{deliv.type}</span>
                      </div>
                    </div>

                    <span className={`text-[10px] font-extrabold px-2.5 py-0.5 rounded-full border ${
                      deliv.status === 'Approved'
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                        : deliv.status === 'Submitted'
                        ? 'bg-amber-50 text-amber-700 border-amber-200'
                        : 'bg-slate-100 text-slate-600 border-slate-200'
                    }`}>
                      {deliv.status}
                    </span>
                  </div>

                  <div className="space-y-1.5 py-2 border-t border-b border-slate-100 my-3 text-[11px]">
                    <div className="flex items-center justify-between text-slate-500 font-semibold">
                      <span>Project:</span>
                      <span className="font-extrabold text-slate-800">{deliv.project_title}</span>
                    </div>
                    <div className="flex items-center justify-between text-slate-500 font-semibold">
                      <span>Client:</span>
                      <span className="font-bold text-cyan-700">{deliv.client_name}</span>
                    </div>
                    {deliv.notes && (
                      <p className="text-[10px] text-slate-500 font-medium italic pt-1">
                        "{deliv.notes}"
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex items-center justify-between pt-2">
                  <a
                    href={deliv.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-xs font-black text-cyan-600 hover:text-cyan-700 hover:underline"
                  >
                    Open Asset <ExternalLink className="w-3.5 h-3.5" />
                  </a>

                  {isAdmin && (
                    <button
                      onClick={() => handleDeleteDeliverable(deliv.project_id, deliv.id)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                      title="Delete deliverable"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Add Deliverable Modal */}
      <AnimatePresence>
        {showAddModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 border border-slate-100 text-left"
            >
              <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-5">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-cyan-50 text-cyan-600 flex items-center justify-center">
                    <Plus className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-black text-slate-900">Upload Project Deliverable</h3>
                    <p className="text-xs text-slate-400 font-semibold">Link asset URL to an active project</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowAddModal(false)}
                  className="p-1 rounded-lg text-slate-400 hover:text-slate-600 cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleAddDeliverable} className="space-y-4">
                <div>
                  <label className="block text-[11px] font-extrabold uppercase tracking-wider text-slate-600 mb-1">
                    Select Project *
                  </label>
                  <select
                    required
                    value={targetProjectId}
                    onChange={e => setTargetProjectId(e.target.value)}
                    className="w-full h-10 px-3 rounded-xl border border-slate-200 text-xs font-semibold focus:outline-none focus:border-cyan-500 bg-white"
                  >
                    <option value="">Choose a project...</option>
                    {projects.map(p => (
                      <option key={p.id} value={p.id}>
                        {p.title} ({p.client_name})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-extrabold uppercase tracking-wider text-slate-600 mb-1">
                    Deliverable Title *
                  </label>
                  <input
                    type="text"
                    required
                    value={delivTitle}
                    onChange={e => setDelivTitle(e.target.value)}
                    placeholder="e.g. High-Fidelity Figma Prototype v2"
                    className="w-full h-10 px-3 rounded-xl border border-slate-200 text-xs font-semibold focus:outline-none focus:border-cyan-500"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-extrabold uppercase tracking-wider text-slate-600 mb-1">
                    Deliverable Type
                  </label>
                  <select
                    value={delivType}
                    onChange={e => setDelivType(e.target.value)}
                    className="w-full h-10 px-3 rounded-xl border border-slate-200 text-xs font-semibold focus:outline-none focus:border-cyan-500 bg-white"
                  >
                    <option value="Figma">Figma Link</option>
                    <option value="Google Drive">Google Drive Folder</option>
                    <option value="GitHub / Code">GitHub Repository</option>
                    <option value="Live URL">Live Website URL</option>
                    <option value="Video Reel">Video Reel</option>
                    <option value="Design Files">Design Files</option>
                    <option value="PDF / Document">PDF / Document</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-extrabold uppercase tracking-wider text-slate-600 mb-1">
                    Asset URL / Link *
                  </label>
                  <input
                    type="url"
                    required
                    value={delivUrl}
                    onChange={e => setDelivUrl(e.target.value)}
                    placeholder="https://figma.com/file/... or https://github.com/..."
                    className="w-full h-10 px-3 rounded-xl border border-slate-200 text-xs font-semibold focus:outline-none focus:border-cyan-500"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-extrabold uppercase tracking-wider text-slate-600 mb-1">
                    Version Notes / Scope
                  </label>
                  <textarea
                    rows={2}
                    value={delivNotes}
                    onChange={e => setDelivNotes(e.target.value)}
                    placeholder="e.g. Ready for client review. Includes desktop and mobile responsive views."
                    className="w-full p-3 rounded-xl border border-slate-200 text-xs font-semibold focus:outline-none focus:border-cyan-500"
                  />
                </div>

                <div className="pt-3 flex items-center justify-end gap-3 border-t border-slate-100">
                  <Button
                    variant="outline"
                    type="button"
                    onClick={() => setShowAddModal(false)}
                    className="text-xs"
                  >
                    Cancel
                  </Button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="h-9 px-5 rounded-xl text-xs font-black text-slate-900 bg-cyan-400 hover:bg-cyan-300 transition-all shadow-md cursor-pointer disabled:opacity-50"
                  >
                    {isSubmitting ? 'Linking...' : 'Save Deliverable'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
