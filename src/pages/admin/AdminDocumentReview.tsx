import React, { useEffect, useMemo, useState } from 'react';
import {
  Search, Eye, CheckCircle2, X, RefreshCw, RotateCcw, XCircle, FileText, AlertCircle, Clock, UploadCloud, ChevronLeft, Users, FilePlus2, Globe,
} from 'lucide-react';
import { useDocuments } from '../../hooks/useDocuments';
import { useApplications } from '../../hooks/useApplications';
import { createNawaRecord } from '../../lib/api/nawa';
import { getStudents } from '../../lib/api/students';
import { getAllDocumentRequirements, calculateDossierStatus, type DocumentRequirement } from '../../lib/api/documentRequirements';
import { ToastNotification } from '../../components/ToastNotification';
import { DocumentViewer, type ViewerDoc } from '../../components/DocumentViewer';
import { DocumentUploadDialog, type UploadDone } from '../../components/DocumentUploadDialog';
import { PageHeader, EmptyState } from '../../components/Kit';
import { BlockCap } from '../../components/CapLoader';
import { useAuth } from '../../contexts/AuthContext';
import type { StudentDocument } from '../../lib/types';

type Norm = 'Approved' | 'Under Review' | 'Needs action' | 'Submitted';
const norm = (status: string, notes?: string): Norm => {
  const s = (status || '').toLowerCase();
  if (s.includes('verified') || s.includes('approved')) return 'Approved';
  if (s.includes('reject') || s.includes('re-upload') || s.includes('reupload')) return 'Needs action';
  if (s.includes('under review')) return 'Under Review';
  void notes;
  return 'Submitted';
};
const TONE: Record<Norm | 'Missing', string> = {
  Approved: 'bg-emerald-50 text-emerald-700 ring-emerald-600/15',
  'Under Review': 'bg-amber-50 text-amber-800 ring-amber-600/20',
  'Needs action': 'bg-rose-50 text-rose-700 ring-rose-600/15',
  Submitted: 'bg-sky-50 text-sky-700 ring-sky-600/15',
  Missing: 'bg-slate-100 text-slate-600 ring-slate-500/15',
};
const LABEL: Record<Norm | 'Missing', string> = { Approved: 'Approved', 'Under Review': 'Under review', 'Needs action': 'Re-upload asked', Submitted: 'To review', Missing: 'Not uploaded' };
const Pill: React.FC<{ s: Norm | 'Missing' }> = ({ s }) => <span className={`inline-flex px-2.5 py-1 rounded-full text-[11px] font-semibold ring-1 ring-inset whitespace-nowrap ${TONE[s]}`}>{LABEL[s]}</span>;
const dateOf = (iso?: string | null) => (iso ? new Date(iso).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '');
const btnPrimary = 'h-8 px-3 rounded-lg bg-[#58051E] text-white text-xs font-bold hover:bg-[#430316] inline-flex items-center gap-1.5 cursor-pointer disabled:opacity-50';
const btnGhost = 'h-8 px-3 rounded-lg border border-slate-200 text-xs font-bold text-slate-700 hover:bg-slate-50 inline-flex items-center gap-1.5 cursor-pointer';

interface StudentInfo { full_name: string; email: string; assigned_counselor?: string; target_country?: string }

export interface AdminDocumentReviewProps { isStaff?: boolean }

export const AdminDocumentReview: React.FC<AdminDocumentReviewProps> = ({ isStaff = false }) => {
  const { profile, user } = useAuth();
  const myEmail = (profile?.email || user?.email || '').toLowerCase().trim();
  const myName = (profile?.full_name || '').toLowerCase().trim();
  const { documents: dbDocs, loading, changeStatus, addDoc, replaceDoc } = useDocuments();
  const { applications } = useApplications();

  const [requirements, setRequirements] = useState<DocumentRequirement[]>([]);
  const [students, setStudents] = useState<Record<string, StudentInfo>>({});
  const [search, setSearch] = useState('');
  const [queueOnly, setQueueOnly] = useState(false);
  const [selected, setSelected] = useState<string | null>(null);
  const [viewing, setViewing] = useState<(ViewerDoc & { doc?: StudentDocument }) | null>(null);
  const [upload, setUpload] = useState<{ req?: DocumentRequirement; replaceId?: string } | null>(null);
  const [asking, setAsking] = useState<StudentDocument | null>(null);
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState('');
  const [toast, setToast] = useState('');

  useEffect(() => {
    const load = () => { getAllDocumentRequirements().then(setRequirements).catch(() => {}); };
    load();
    window.addEventListener('ferex_doc_requirements_change', load);
    return () => window.removeEventListener('ferex_doc_requirements_change', load);
  }, []);

  useEffect(() => {
    const load = () => {
      getStudents().then((list: any[]) => {
        const map: Record<string, StudentInfo> = {};
        (list || []).forEach(s => { if (s.id) map[s.id] = { full_name: s.full_name || s.name || s.email?.split('@')[0] || 'Student', email: s.email || '', assigned_counselor: s.assigned_counselor || '', target_country: s.target_country || '' }; });
        setStudents(map);
      }).catch(() => {});
    };
    load();
    window.addEventListener('ferex_students_change', load);
    return () => window.removeEventListener('ferex_students_change', load);
  }, []);

  const countryOf = (studentId: string) => {
    const saved = students[studentId]?.target_country;
    if (saved && saved.toLowerCase().trim() !== 'not set') return saved.trim();
    const app: any = applications.find(a => a.student_id === studentId);
    return (app?.universities?.country || app?.country || '').trim();
  };

  const mine = (id: string) => {
    if (!isStaff || (!myEmail && !myName)) return true;
    const ac = (students[id]?.assigned_counselor || '').toLowerCase().trim();
    return Boolean(ac && ((myEmail && ac.includes(myEmail)) || (myName && ac.includes(myName))));
  };

  // One row per student: everyone in scope, even those with no files yet.
  const rows = useMemo(() => {
    const byStudent = new Map<string, StudentDocument[]>();
    dbDocs.forEach(d => { if (d.student_id) byStudent.set(d.student_id, [...(byStudent.get(d.student_id) || []), d]); });
    Object.keys(students).forEach(id => { if (!byStudent.has(id)) byStudent.set(id, []); });
    return Array.from(byStudent.entries()).filter(([id]) => mine(id) && students[id]).map(([id, list]) => {
      const country = countryOf(id);
      const reqs = requirements.filter(r => r.country.toLowerCase().trim() === (country || 'general').toLowerCase());
      const dossier = calculateDossierStatus(reqs, list);
      const required = dossier.results.filter(r => r.requirement.is_required);
      const pct = required.length ? Math.round((required.filter(r => r.isSatisfied).length / required.length) * 100) : null;
      return { id, name: students[id]?.full_name || 'Student', email: students[id]?.email || '', country, docs: list, dossier, pct, toReview: list.filter(d => norm(d.status) === 'Submitted' || norm(d.status) === 'Under Review').length };
    }).sort((a, b) => b.toReview - a.toReview || a.name.localeCompare(b.name));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dbDocs, students, requirements, applications, isStaff, myEmail, myName]);

  useEffect(() => { if (!selected && rows.length && typeof window !== 'undefined' && window.innerWidth >= 1024) setSelected(rows[0].id); }, [rows, selected]);

  const visible = rows.filter(r => (!queueOnly || r.toReview > 0) && (!search.trim() || `${r.name} ${r.email} ${r.country}`.toLowerCase().includes(search.trim().toLowerCase())));
  const current = rows.find(r => r.id === selected) || null;
  const totalToReview = rows.reduce((n, r) => n + r.toReview, 0);
  const flash = (m: string) => { setToast(m); };

  const approve = async (d: StudentDocument) => {
    setBusy(d.id);
    try {
      await changeStatus(d.id, 'Approved', '', user?.id);
      const sid = d.student_id;
      try {
        await createNawaRecord({ student_id: sid, student_name: students[sid]?.full_name || 'Student', document_type: d.doc_type || d.file_name, notes: 'Document verified. Legalization and admission can start.' });
        const { setStudentStageStatus } = await import('../../lib/api/journey');
        await setStudentStageStatus(sid, 4, 'Completed');
        await setStudentStageStatus(sid, 5, 'In Progress');
      } catch { /* the approval itself is saved; follow-up steps can be retried */ }
      flash(`Approved. ${students[sid]?.full_name || 'The student'} has been notified.`);
    } catch (e) { flash((e as Error).message); } finally { setBusy(''); }
  };

  const reject = async (d: StudentDocument) => {
    setBusy(d.id);
    try {
      await changeStatus(d.id, 'Rejected' as any, d.reviewer_notes || 'Document rejected', user?.id);
      flash(`Rejected. ${students[d.student_id]?.full_name || 'The student'} has been notified.`);
    } catch (e) { flash((e as Error).message); } finally { setBusy(''); }
  };

  const sendAsk = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!asking) return;
    if (!note.trim()) { flash('Tell the student what to fix.'); return; }
    setBusy(asking.id);
    try { await changeStatus(asking.id, 'Rejected' as any, note.trim(), user?.id); flash('Sent. The student can upload a new copy.'); setAsking(null); setNote(''); }
    catch (err) { flash((err as Error).message); } finally { setBusy(''); }
  };

  const saveUpload = async (r: UploadDone) => {
    if (!current) return;
    const base = { file_name: r.fileName, file_url: r.path, file_size: r.size, doc_type: (upload?.req?.document_type || 'Other') as any, requirement_id: upload?.req?.id, requirement_name: upload?.req?.document_name };
    if (upload?.replaceId) {
      await replaceDoc(upload.replaceId, base);
      flash(`${r.title} replaced for ${current.name}.`);
    } else {
      await addDoc({ student_id: current.id, ...base });
      flash(`${r.title} uploaded for ${current.name}.`);
    }
  };

  const viewerFooter = viewing?.doc && (
    <div className="flex flex-wrap items-center justify-between gap-2">
      <div className="flex items-center gap-2"><Pill s={norm(viewing.doc.status)} />{viewing.doc.reviewer_notes && <span className="text-xs text-slate-600 truncate max-w-[40ch]">“{viewing.doc.reviewer_notes}”</span>}</div>
      <div className="flex gap-2">
        {norm(viewing.doc.status) !== 'Needs action' && <button type="button" className={btnGhost} onClick={() => { setAsking(viewing.doc!); setNote(viewing.doc!.reviewer_notes || ''); setViewing(null); }}><RefreshCw className="w-3.5 h-3.5" />Ask for re-upload</button>}
        {norm(viewing.doc.status) === 'Needs action' && <span className="text-xs font-semibold text-rose-700 self-center">Waiting for the student to upload a corrected copy</span>}
        {norm(viewing.doc.status) !== 'Approved' && norm(viewing.doc.status) !== 'Needs action' && <button type="button" className={btnPrimary} disabled={busy === viewing.doc.id} onClick={async () => { await approve(viewing.doc!); setViewing(null); }}><CheckCircle2 className="w-3.5 h-3.5" />Approve</button>}
      </div>
    </div>
  );

  const open = (d: StudentDocument) => setViewing({ name: d.file_name, url: d.file_url, subtitle: `${current?.name || ''} · uploaded ${dateOf(d.uploaded_at)}`, doc: d });

  const fileActions = (d: StudentDocument, req?: DocumentRequirement) => {
    const n = norm(d.status);
    return (
      <div className="flex flex-wrap items-center gap-2">
        <Pill s={n} />
        <button type="button" className={btnGhost} onClick={() => open(d)}><Eye className="w-3.5 h-3.5" />View</button>
        {n !== 'Approved' && n !== 'Needs action' && <button type="button" className={btnPrimary} disabled={busy === d.id} onClick={() => approve(d)}><CheckCircle2 className="w-3.5 h-3.5" />Approve</button>}
        {n !== 'Needs action' && <button type="button" className={btnGhost} onClick={() => { setAsking(d); setNote(d.reviewer_notes || ''); }}><RotateCcw className="w-3.5 h-3.5" />Ask re-upload</button>}
        <button type="button" className={btnGhost} disabled={busy === d.id} onClick={() => reject(d)}><XCircle className="w-3.5 h-3.5" />Reject</button>
      </div>
    );
  };

  const detail = current && (() => {
    const linked = new Set(current.dossier.results.map(r => r.doc?.id).filter(Boolean));
    const extra = current.docs.filter(d => !linked.has(d.id));
    const displayList = extra.length > 0 ? extra : current.docs;
    return (
      <div className="space-y-4">
        <button type="button" onClick={() => setSelected(null)} className="lg:hidden text-xs font-bold text-slate-500 inline-flex items-center gap-1 mb-2 cursor-pointer"><ChevronLeft className="w-3.5 h-3.5" />All students</button>

        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <h3 className="text-sm font-bold text-slate-900">Other files</h3>
          <span className="text-xs font-semibold text-slate-500 bg-slate-50 border border-slate-200/80 px-2.5 py-0.5 rounded-full">{displayList.length} {displayList.length === 1 ? 'file' : 'files'}</span>
        </div>

        {displayList.length === 0 ? (
          <p className="text-xs text-slate-400 rounded-xl border border-dashed border-slate-200 bg-slate-50/50 p-6 text-center">No other files uploaded yet.</p>
        ) : (
          <ul className="divide-y divide-slate-100">
            {displayList.map(d => (
              <li key={d.id} className="py-3 flex flex-col md:flex-row md:items-center gap-2.5 justify-between">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-slate-900 truncate">{d.file_name}</p>
                  <p className="text-[11px] text-slate-500">{[d.doc_type, d.file_size, dateOf(d.uploaded_at)].filter(Boolean).join(' · ')}</p>
                </div>
                {fileActions(d)}
              </li>
            ))}
          </ul>
        )}
      </div>
    );
  })();

  return (
    <div className="space-y-5 text-left">
      <ToastNotification message={toast} onClose={() => setToast('')} />
      <PageHeader
        eyebrow="Ferex Education"
        title="Documents"
        subtitle={isStaff ? 'Review your students’ documents, approve them or ask for a new upload.' : 'Review student documents, approve them, ask for a new upload, or upload on a student’s behalf.'}
        actions={<span className="inline-flex items-center gap-1.5 text-xs font-bold text-amber-800 bg-amber-50 ring-1 ring-inset ring-amber-600/20 rounded-full px-3 py-1.5"><Clock className="w-3.5 h-3.5" />{totalToReview} to review</span>}
      />

      <div className="grid lg:grid-cols-[320px_minmax(0,1fr)] gap-5 items-start">
        <aside className={`${selected ? 'hidden lg:block' : ''} space-y-3`}>
          <div className="relative"><Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" /><input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search students" className="w-full h-10 pl-9 pr-3" /></div>
          <label className="flex items-center gap-2 text-xs font-semibold text-slate-600 cursor-pointer"><input type="checkbox" checked={queueOnly} onChange={e => setQueueOnly(e.target.checked)} className="w-4 h-4 accent-[#58051E]" />Only students with files to review</label>
          {loading ? <BlockCap /> : visible.length === 0 ? (
            <EmptyState icon={Users} title={rows.length ? 'No students match' : isStaff ? 'No students assigned to you' : 'No students yet'} hint={rows.length ? 'Clear the search or the review filter.' : 'Students appear here once they register.'} />
          ) : (
            <ul className="space-y-2 max-h-[70vh] overflow-y-auto pr-1">
              {visible.map(r => (
                <li key={r.id}>
                  <button type="button" onClick={() => setSelected(r.id)} className={`w-full text-left rounded-xl border p-3 transition cursor-pointer ${selected === r.id ? 'border-[#58051E] bg-[#58051E]/[0.04] ring-1 ring-[#58051E]/20' : 'border-slate-200 bg-white hover:border-slate-300'}`}>
                    <div className="flex items-center justify-between gap-2"><p className="text-sm font-bold text-slate-900 truncate">{r.name}</p>{r.toReview > 0 && <span className="text-[10px] font-bold bg-amber-100 text-amber-800 rounded-full px-2 py-0.5 shrink-0">{r.toReview} to review</span>}</div>
                    <p className="text-[11px] text-slate-500 truncate">{r.country || 'No country yet'} · {r.docs.length} {r.docs.length === 1 ? 'file' : 'files'}</p>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </aside>

        <main className={`${selected ? '' : 'hidden lg:block'} rounded-2xl border border-slate-200/80 bg-white p-4 sm:p-5 h-fit`}>
          {detail || <EmptyState icon={FileText} title="Pick a student" hint="Choose a student on the left to see their checklist and files." />}
        </main>
      </div>

      {asking && (
        <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center sm:p-4" role="dialog" aria-modal="true" aria-label="Ask for a new upload">
          <div className="absolute inset-0 bg-slate-900/50" onClick={() => setAsking(null)} />
          <form onSubmit={sendAsk} className="relative bg-white w-full sm:max-w-md rounded-t-3xl sm:rounded-3xl p-5 space-y-3 shadow-2xl">
            <div className="flex items-start justify-between gap-3"><div><h3 className="text-base font-bold text-slate-900">Ask for a new upload</h3><p className="text-xs text-slate-500 mt-0.5 truncate">{asking.file_name}</p></div><button type="button" aria-label="Close" onClick={() => setAsking(null)} className="p-1.5 rounded-full hover:bg-slate-100 text-slate-400 cursor-pointer"><X className="w-4 h-4" /></button></div>
            <label className="block"><span className="block text-xs font-semibold text-slate-600 mb-1">What should the student fix?</span>
              <textarea autoFocus rows={3} value={note} onChange={e => setNote(e.target.value)} className="w-full px-3 py-2" placeholder="e.g. The scan is blurry. Please upload a clear colour copy of pages 1 and 2." /></label>
            <p className="text-[11px] text-slate-500 flex items-start gap-1.5"><AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />The student is notified and sees this message next to the document.</p>
            <div className="flex justify-end gap-2"><button type="button" className={btnGhost} onClick={() => setAsking(null)}>Cancel</button><button type="submit" className={btnPrimary} disabled={busy === asking.id}>{busy === asking.id ? 'Sending…' : 'Send request'}</button></div>
          </form>
        </div>
      )}

      <DocumentUploadDialog
        open={!!upload && !!current}
        studentId={current?.id || ''}
        forStudentName={current?.name}
        fixedTitle={upload?.req?.document_name}
        hint={upload?.req?.description}
        onClose={() => setUpload(null)}
        onUploaded={saveUpload}
      />
      <DocumentViewer doc={viewing} onClose={() => setViewing(null)} footer={viewerFooter} />
    </div>
  );
};

export default AdminDocumentReview;
