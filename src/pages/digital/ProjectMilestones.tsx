import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Plus, Trash2, Target, X } from 'lucide-react';
import { Button } from '../../components/Button';
import { supabase } from '../../lib/supabase';
import { getProjectTerms, type ProjectTerm } from '../../lib/api/digitalCommerce';
import { createDigitalMilestoneDirect, deleteDigitalMilestoneDirect, getAssignedDigitalMilestones, updateDigitalMilestoneDirect, type DigitalMilestone } from '../../lib/api/digitalPm';

const STATUSES: DigitalMilestone['status'][] = ['Pending', 'In Progress', 'In Review', 'Completed', 'Approved'];
const day = (d?: string) => { if (!d) return 'No date'; const x = new Date(d); return Number.isNaN(x.getTime()) ? d : x.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }); };
const tone = (s: string) => s === 'Approved' || s === 'Completed' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : s === 'In Review' ? 'bg-amber-50 text-amber-700 border-amber-200' : s === 'In Progress' ? 'bg-blue-50 text-blue-700 border-blue-200' : 'bg-slate-100 text-slate-600 border-slate-200';

/** The project's delivery milestones: add one, move it through its statuses, or remove it. Works for admins and the project's team. */
export const ProjectMilestones: React.FC<{ projectId: string; projectTitle: string; canEdit: boolean; toast: (m: string) => void }> = ({ projectId, projectTitle, canEdit, toast }) => {
  const [rows, setRows] = useState<DigitalMilestone[]>([]);
  const [terms, setTerms] = useState<ProjectTerm[]>([]);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const blank = { title: '', description: '', due_date: new Date(Date.now() + 14 * 86400000).toISOString().slice(0, 10), part_id: '', deliverables_summary: '' };
  const [f, setF] = useState(blank);
  const toastRef = useRef(toast); toastRef.current = toast;

  const load = useCallback(async () => {
    try { setRows(await getAssignedDigitalMilestones([projectId])); } catch (e: any) { toastRef.current(e.message); }
  }, [projectId]);
  useEffect(() => {
    void load();
    getProjectTerms(projectId).then(setTerms).catch(() => setTerms([]));
    const ch = supabase.channel(`pm-ms-${projectId}-${Math.random().toString(36).slice(2, 7)}`).on('postgres_changes', { event: '*', schema: 'public', table: 'digital_milestones' }, () => void load()).subscribe();
    const h = () => void load();
    window.addEventListener('ferex_digital_milestones_change', h);
    return () => { void supabase.removeChannel(ch); window.removeEventListener('ferex_digital_milestones_change', h); };
  }, [projectId, load]);

  const add = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!f.title.trim()) { toast('Give the milestone a name.'); return; }
    setBusy(true);
    try {
      await createDigitalMilestoneDirect({ project_id: projectId, project_title: projectTitle, title: f.title, description: f.description, due_date: f.due_date, part_id: f.part_id || null, deliverables_summary: f.deliverables_summary, status: 'Pending' });
      toast(`Milestone "${f.title}" added`); setF(blank); setOpen(false); await load();
    } catch (err: any) { toast(err.message); } finally { setBusy(false); }
  };
  const setStatus = async (m: DigitalMilestone, status: DigitalMilestone['status']) => {
    const pct = status === 'Completed' || status === 'Approved' ? 100 : status === 'In Review' ? 80 : status === 'In Progress' ? 50 : 0;
    try { await updateDigitalMilestoneDirect(m.id, { status, completion_percentage: pct }); await load(); } catch (err: any) { toast(err.message); }
  };
  const remove = async (m: DigitalMilestone) => {
    if (!window.confirm(`Remove the milestone "${m.title}"?`)) return;
    try { await deleteDigitalMilestoneDirect(m.id); toast('Milestone removed'); await load(); } catch (err: any) { toast(err.message); }
  };

  return (
    <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="text-xs font-bold text-slate-700 flex items-center gap-1.5"><Target className="w-3.5 h-3.5 text-[#5A0122]" /> Project Milestones ({rows.length})</h4>
        {canEdit && <Button size="sm" type="button" className="h-7 px-2.5 text-[11px] font-bold" onClick={() => setOpen(o => !o)}>{open ? <><X className="w-3.5 h-3.5 mr-1" /> Close</> : <><Plus className="w-3.5 h-3.5 mr-1" /> Add Milestone</>}</Button>}
      </div>
      {open && (
        <form onSubmit={add} className="p-3 bg-white rounded-xl border border-slate-200 space-y-2 text-xs">
          <div className="grid grid-cols-2 gap-2">
            <label className="col-span-2 block"><span className="block text-[10px] font-extrabold uppercase text-slate-400 mb-1">Milestone name *</span><input aria-label="Milestone name" value={f.title} onChange={e => setF({ ...f, title: e.target.value })} placeholder="e.g. Design approval" className="w-full h-9 px-3 bg-slate-50 border border-slate-200 rounded-lg font-semibold" /></label>
            <label className="block"><span className="block text-[10px] font-extrabold uppercase text-slate-400 mb-1">Due date</span><input type="date" aria-label="Milestone due date" value={f.due_date} onChange={e => setF({ ...f, due_date: e.target.value })} className="w-full h-9 px-3 bg-slate-50 border border-slate-200 rounded-lg font-semibold" /></label>
            <label className="block"><span className="block text-[10px] font-extrabold uppercase text-slate-400 mb-1">Linked payment</span>
              <select aria-label="Linked payment term" value={f.part_id} onChange={e => setF({ ...f, part_id: e.target.value })} className="w-full h-9 px-2 bg-slate-50 border border-slate-200 rounded-lg font-semibold"><option value="">Not linked to a payment</option>{terms.map(t => <option key={t.id} value={t.id}>{t.label} · due {day(t.due_date)}</option>)}</select></label>
            <label className="col-span-2 block"><span className="block text-[10px] font-extrabold uppercase text-slate-400 mb-1">What will be delivered</span><textarea rows={2} aria-label="Deliverables" value={f.deliverables_summary} onChange={e => setF({ ...f, deliverables_summary: e.target.value })} className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg font-semibold" /></label>
          </div>
          <div className="flex justify-end gap-2"><Button type="button" size="sm" variant="outline" className="text-xs font-bold" onClick={() => setOpen(false)}>Cancel</Button><Button type="submit" size="sm" disabled={busy} className="text-xs font-bold">Save milestone</Button></div>
        </form>
      )}
      {rows.length === 0 ? <p className="text-[11px] font-semibold text-slate-500">No milestones yet.{canEdit ? ' Use “Add Milestone” to plan the first one.' : ''}</p> : (
        <ul className="space-y-1.5">
          {rows.map(m => (
            <li key={m.id} className="bg-white rounded-lg border border-slate-100 px-3 py-2 flex flex-wrap items-center justify-between gap-2 text-[11px]">
              <div className="min-w-0"><p className="font-bold text-slate-800 truncate">{m.title}</p><p className="text-slate-500">Due {day(m.due_date)}{m.deliverables_summary ? ` · ${m.deliverables_summary}` : ''}</p></div>
              <div className="flex items-center gap-1.5">
                {canEdit ? <select aria-label={`Status of ${m.title}`} value={m.status} onChange={e => void setStatus(m, e.target.value as DigitalMilestone['status'])} className={`h-7 px-2 rounded-full border font-extrabold ${tone(m.status)}`}>{STATUSES.map(s => <option key={s} value={s}>{s}</option>)}</select> : <span className={`px-2 py-0.5 rounded-full border font-extrabold ${tone(m.status)}`}>{m.status}</span>}
                {canEdit && <button type="button" aria-label={`Remove ${m.title}`} onClick={() => void remove(m)} className="p-1 text-slate-400 hover:text-rose-600 cursor-pointer"><Trash2 className="w-3.5 h-3.5" /></button>}
              </div>
            </li>))}
        </ul>)}
    </div>
  );
};
