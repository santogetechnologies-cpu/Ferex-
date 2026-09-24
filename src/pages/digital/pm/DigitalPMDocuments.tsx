import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FileText, Plus, Search, ExternalLink, Paperclip, AlertCircle,
  X, CheckCircle2, Layers, FolderKanban
} from 'lucide-react';
import { useAuth } from '../../../contexts/AuthContext';
import { Button } from '../../../components/Button';
import { Badge } from '../../../components/Badge';
import { ToastNotification } from '../../../components/ToastNotification';
import { supabase } from '../../../lib/supabase';
import {
  getAssignedDigitalDeliverables,
  createDigitalDeliverableDirect,
  getAssignedDigitalProjects
} from '../../../lib/api/digitalPm';

export const DigitalPMDocuments: React.FC = () => {
  const { user, profile } = useAuth();

  const [deliverables, setDeliverables] = useState<any[]>([]);
  const [projects, setProjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');
  const [toast, setToast] = useState('');
  const [search, setSearch] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(''), 3000);
  };

  const [newDoc, setNewDoc] = useState({
    title: '',
    project_id: '',
    file_url: '',
    version: 'v1.0'
  });

  const pmIdentity = {
    id: user?.id,
    email: profile?.email || user?.email,
    full_name: profile?.full_name,
    name: profile?.full_name
  };

  const loadDocumentsData = async () => {
    setLoading(true);
    setErrorMsg('');
    try {
      const [dList, pList] = await Promise.all([
        getAssignedDigitalDeliverables(),
        getAssignedDigitalProjects(pmIdentity)
      ]);
      setDeliverables(dList || []);
      setProjects(pList || []);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to load deliverables from database.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDocumentsData();

    const channel = supabase
      .channel('realtime_pm_docs')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'digital_deliverables' }, () => loadDocumentsData())
      .subscribe();

    const handleLocalChange = () => loadDocumentsData();
    window.addEventListener('ferex_digital_deliverables_change', handleLocalChange);

    return () => {
      supabase.removeChannel(channel);
      window.removeEventListener('ferex_digital_deliverables_change', handleLocalChange);
    };
  }, [user?.id, profile?.email]);

  const handleCreateDocument = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDoc.title.trim() || !newDoc.project_id) return;

    try {
      const created = await createDigitalDeliverableDirect({
        project_id: newDoc.project_id,
        title: newDoc.title,
        file_url: newDoc.file_url,
        version: newDoc.version,
        approved_by_client: false
      });

      setDeliverables(prev => [created, ...prev]);
      setShowAddModal(false);
      showToast(`Added deliverable "${newDoc.title}" successfully`);
      setNewDoc({ title: '', project_id: '', file_url: '', version: 'v1.0' });
    } catch (err: any) {
      showToast(`Database Error: ${err.message}`);
    }
  };

  const filteredDocs = deliverables.filter(d => {
    const matchesSearch =
      (d.title || '').toLowerCase().includes(search.toLowerCase()) ||
      (d.file_url || '').toLowerCase().includes(search.toLowerCase());
    return matchesSearch;
  });

  return (
    <div className="space-y-6 relative text-left pb-8">
      <ToastNotification message={toast} onClose={() => setToast('')} />

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5 mb-1">
            <div className="w-8 h-8 rounded-lg bg-[#58051E]/8 text-[#58051E] flex items-center justify-center">
              <FileText className="w-4 h-4" />
            </div>
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">
              Project Deliverables & Documents Vault
            </h1>
            <Badge variant="brand">{filteredDocs.length} Assets</Badge>
          </div>
          <p className="text-xs text-slate-500">
            Figma design systems, GitHub repositories, cloud staging links, and verified deliverables.
          </p>
        </div>

        <Button
          size="sm"
          onClick={() => setShowAddModal(true)}
          leftIcon={<Plus className="w-3.5 h-3.5" />}
        >
          Add Deliverable Link
        </Button>
      </div>

      {errorMsg && (
        <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Filter Bar */}
      <div className="bg-white border border-slate-200/80 rounded-xl p-3 shadow-subtle flex items-center justify-between gap-3">
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search deliverables, URLs, assets..."
            className="w-full h-9 pl-9 pr-3 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-900 focus:bg-white focus:outline-none focus:border-[#58051E]"
          />
        </div>
      </div>

      {/* Deliverables Grid */}
      {loading ? (
        <div className="py-16 flex justify-center items-center">
          <div className="w-8 h-8 border-3 border-[#58051E] border-t-transparent rounded-full animate-spin" />
        </div>
      ) : filteredDocs.length === 0 ? (
        <div className="bg-white border border-slate-200/80 rounded-xl p-12 text-center text-slate-400 text-xs">
          No project deliverables uploaded yet in Supabase.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredDocs.map((d) => {
            const project = projects.find(p => p.id === d.project_id);

            return (
              <div
                key={d.id}
                className="bg-white border border-slate-200/80 rounded-xl p-5 shadow-subtle hover:border-slate-300 transition-all flex flex-col justify-between space-y-3"
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 truncate max-w-[170px]">
                      {project?.title || 'Project Deliverable'}
                    </span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-700">
                      {d.version || 'v1.0'}
                    </span>
                  </div>

                  <h3 className="text-xs font-bold text-slate-900 mb-1">
                    {d.title}
                  </h3>

                  <p className="text-[11px] text-slate-400 truncate font-mono">
                    {d.file_url || 'No URL provided'}
                  </p>
                </div>

                <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                  <span className="text-[10.5px] text-slate-400">
                    Uploaded: {d.uploaded_at ? new Date(d.uploaded_at).toLocaleDateString() : 'Recently'}
                  </span>
                  {d.file_url && (
                    <a
                      href={d.file_url}
                      target="_blank"
                      rel="noreferrer"
                      className="text-[#58051E] font-bold text-xs hover:underline flex items-center gap-1"
                    >
                      Open Asset <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add Deliverable Modal */}
      <AnimatePresence>
        {showAddModal && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50"
              onClick={() => setShowAddModal(false)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-lg bg-white rounded-2xl shadow-2xl z-50 p-6 text-left"
            >
              <div className="flex items-center justify-between mb-4 pb-2 border-b border-slate-100">
                <h3 className="text-sm font-bold text-slate-900">Add Deliverable / Asset URL</h3>
                <button onClick={() => setShowAddModal(false)} className="p-1 text-slate-400 hover:text-slate-600">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleCreateDocument} className="space-y-3.5">
                <div>
                  <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">Asset Title *</label>
                  <input
                    type="text"
                    required
                    value={newDoc.title}
                    onChange={(e) => setNewDoc({ ...newDoc, title: e.target.value })}
                    placeholder="e.g. Master Figma UI Specs & Flowchart"
                    className="w-full h-9 px-3 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-900 focus:bg-white"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">Project *</label>
                  <select
                    required
                    value={newDoc.project_id}
                    onChange={(e) => setNewDoc({ ...newDoc, project_id: e.target.value })}
                    className="w-full h-9 px-3 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-900 focus:bg-white"
                  >
                    <option value="">Select Project</option>
                    {projects.map((p) => (
                      <option key={p.id} value={p.id}>{p.title}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">Asset URL *</label>
                  <input
                    type="url"
                    required
                    value={newDoc.file_url}
                    onChange={(e) => setNewDoc({ ...newDoc, file_url: e.target.value })}
                    placeholder="https://figma.com/... or https://github.com/..."
                    className="w-full h-9 px-3 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-900 focus:bg-white"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">Version</label>
                  <input
                    type="text"
                    value={newDoc.version}
                    onChange={(e) => setNewDoc({ ...newDoc, version: e.target.value })}
                    className="w-full h-9 px-3 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-900 focus:bg-white"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <Button variant="ghost" size="sm" onClick={() => setShowAddModal(false)}>Cancel</Button>
                  <Button size="sm" type="submit">Save Asset</Button>
                </div>
              </form>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};
