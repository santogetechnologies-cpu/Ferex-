import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Folder, Search, Eye, FileText, AlertCircle, CheckCircle2, Clock, UploadCloud, RefreshCw, Globe, ShieldCheck, FilePlus2,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useActiveStudentScope } from '../hooks/useActiveStudentScope';
import { useDocuments } from '../hooks/useDocuments';
import { useApplications } from '../hooks/useApplications';
import { useCountryWorkflows } from '../hooks/useCountryWorkflows';
import { getActiveStudentFeeProfile } from '../lib/educationBilling';
import { getDocumentRequirements, calculateDossierStatus, type DocumentRequirement } from '../lib/api/documentRequirements';
import { sendStudentDocumentUploadedEmail } from '../lib/api/email';
import { DocumentViewer, type ViewerDoc } from '../components/DocumentViewer';
import { DocumentUploadDialog, type UploadDone } from '../components/DocumentUploadDialog';
import { PageHeader, EmptyState } from '../components/Kit';
import { BlockCap } from '../components/CapLoader';

type Norm = 'Approved' | 'Under Review' | 'Needs action' | 'Submitted';
const norm = (s: string): Norm => {
  const v = (s || '').toLowerCase();
  if (v.includes('verified') || v.includes('approved')) return 'Approved';
  if (v.includes('reject') || v.includes('re-upload')) return 'Needs action';
  if (v.includes('under review')) return 'Under Review';
  return 'Submitted';
};
const TONE: Record<Norm | 'Missing', string> = {
  Approved: 'bg-emerald-50 text-emerald-700 ring-emerald-600/15',
  'Under Review': 'bg-amber-50 text-amber-800 ring-amber-600/20',
  'Needs action': 'bg-rose-50 text-rose-700 ring-rose-600/15',
  Submitted: 'bg-sky-50 text-sky-700 ring-sky-600/15',
  Missing: 'bg-slate-100 text-slate-600 ring-slate-500/15',
};
const LABEL: Record<Norm | 'Missing', string> = { Approved: 'Approved', 'Under Review': 'Being reviewed', 'Needs action': 'Upload again', Submitted: 'Waiting for review', Missing: 'Not uploaded' };
const Pill: React.FC<{ s: Norm | 'Missing' }> = ({ s }) => <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-semibold ring-1 ring-inset whitespace-nowrap ${TONE[s]}`}>{LABEL[s]}</span>;
const dateOf = (iso?: string) => (iso ? new Date(iso).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '');

const btnPrimary = 'h-9 px-4 rounded-xl bg-[#58051E] text-white text-xs font-bold hover:bg-[#430316] inline-flex items-center gap-1.5 cursor-pointer';
const btnGhost = 'h-9 px-3.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-700 hover:bg-slate-50 inline-flex items-center gap-1.5 cursor-pointer';

export const Documents: React.FC = () => {
  const { user, profile } = useAuth();
  const { activeStudentId, activeStudentEmail, activeStudentName, isImpersonating } = useActiveStudentScope();
  const { applications } = useApplications(activeStudentId);
  const { getWorkflowForCountry } = useCountryWorkflows();

  const isStaffRole = ['admin', 'super_admin', 'superadmin', 'staff', 'counselor', 'education_admin', 'central'].includes((profile?.role || 'student').toLowerCase());
  const studentId = activeStudentId || (!isStaffRole ? user?.id : undefined);
  const { documents: docs, loading, addDoc, replaceDoc } = useDocuments(studentId, !!studentId);

  const [requirements, setRequirements] = useState<DocumentRequirement[]>([]);
  const [tab, setTab] = useState<'checklist' | 'files'>('checklist');
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'All' | Norm>('All');
  const [viewing, setViewing] = useState<ViewerDoc | null>(null);
  const [upload, setUpload] = useState<{ req?: DocumentRequirement; replaceId?: string } | null>(null);
  const [toast, setToast] = useState('');

  const country = useMemo(() => {
    const bad = (c?: string | null) => !c || !c.trim() || c.toLowerCase().trim() === 'not set';
    const fromProfile = (getActiveStudentFeeProfile() as any)?.country;
    const fromApp = (applications[0] as any)?.universities?.country || (applications[0] as any)?.country;
    return [fromProfile, fromApp, (profile as any)?.target_country].find(c => !bad(c))?.trim() || '';
  }, [applications, profile, activeStudentId]);

  useEffect(() => {
    const load = () => { getDocumentRequirements(country || 'General').then(setRequirements).catch(() => setRequirements([])); };
    load();
    window.addEventListener('ferex_doc_requirements_change', load);
    window.addEventListener('ferex_country_change', load);
    return () => { window.removeEventListener('ferex_doc_requirements_change', load); window.removeEventListener('ferex_country_change', load); };
  }, [country]);

  const workflow = country ? getWorkflowForCountry(country) : null;
  const dossier = useMemo(() => calculateDossierStatus(requirements, docs), [requirements, docs]);
  const required = dossier.results.filter(r => r.requirement.is_required);
  const uploadedPct = required.length ? Math.round((required.filter(r => r.isSatisfied).length / required.length) * 100) : 0;
  const approvedPct = required.length ? Math.round((required.filter(r => r.status === 'Approved').length / required.length) * 100) : 0;
  const linkedIds = new Set(dossier.results.map(r => r.doc?.id).filter(Boolean));
  const extraDocs = docs.filter(d => !linkedIds.has(d.id));
  const needAction = docs.filter(d => norm(d.status) === 'Needs action');

  const flash = (m: string) => { setToast(m); setTimeout(() => setToast(''), 3500); };
  const view = (d: { file_name: string; file_url: string; uploaded_at?: string }) => setViewing({ name: d.file_name, url: d.file_url, subtitle: `Uploaded ${dateOf(d.uploaded_at)}` });

  const save = async (r: UploadDone) => {
    const sid = studentId!;
    const base = { file_name: r.fileName, file_url: r.path, file_size: r.size, doc_type: (upload?.req?.document_type || 'Other') as any, requirement_id: upload?.req?.id, requirement_name: upload?.req?.document_name };
    if (upload?.replaceId) await replaceDoc(upload.replaceId, base); else await addDoc({ student_id: sid, ...base });
    const email = activeStudentEmail || user?.email;
    if (email) sendStudentDocumentUploadedEmail({ studentEmail: email, studentName: activeStudentName || profile?.full_name || 'Student', documentName: r.fileName, documentType: String(base.doc_type), fileSize: r.size }).catch(() => {});
    flash(`${r.title} uploaded. It is now waiting for review.`);
  };

  const filtered = docs.filter(d => {
    const q = query.trim().toLowerCase();
    return (!q || `${d.file_name} ${d.doc_type} ${d.requirement_name || ''}`.toLowerCase().includes(q)) && (statusFilter === 'All' || norm(d.status) === statusFilter);
  });

  if (!studentId) {
    return (
      <div className="space-y-6">
        <PageHeader eyebrow="Ferex Education" title="Student documents" subtitle="Documents belong to a student." />
        <EmptyState icon={Folder} title="Open a student first" hint="Choose a student under Documents in the admin menu to see and manage their files." />
      </div>
    );
  }

  const ringR = 34, ring = 2 * Math.PI * ringR;
  return (
    <div className="space-y-6 text-left pb-10">
      <PageHeader
        eyebrow="Ferex Education"
        title={isImpersonating && activeStudentName ? `${activeStudentName}'s documents` : 'My documents'}
        subtitle="Upload each required document once. We review it and tell you if anything needs to change."
        actions={<button type="button" className={btnPrimary} onClick={() => setUpload({})}><UploadCloud className="w-4 h-4" />Upload a document</button>}
      />
      {toast && <p role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-800">{toast}</p>}

      {/* Progress */}
      <section className="rounded-2xl border border-slate-200/80 bg-white p-5 flex flex-col sm:flex-row sm:items-center gap-5">
        <div className="relative w-[84px] h-[84px] shrink-0" aria-label={`${uploadedPct}% of required documents uploaded`}>
          <svg viewBox="0 0 84 84" className="-rotate-90 w-full h-full">
            <circle cx="42" cy="42" r={ringR} fill="none" stroke="#e2e8f0" strokeWidth="8" />
            <circle cx="42" cy="42" r={ringR} fill="none" stroke="#58051E" strokeWidth="8" strokeLinecap="round" strokeDasharray={ring} strokeDashoffset={ring * (1 - uploadedPct / 100)} style={{ transition: 'stroke-dashoffset .5s' }} />
          </svg>
          <span className="absolute inset-0 flex items-center justify-center text-lg font-extrabold text-slate-900 tabular-nums">{uploadedPct}%</span>
        </div>
        <div className="flex-1 min-w-0 space-y-1.5">
          <h2 className="text-sm font-bold text-slate-900">{required.length ? `${required.filter(r => r.isSatisfied).length} of ${required.length} required documents uploaded` : 'No required documents set for your destination yet'}</h2>
          <p className="text-xs text-slate-500">{required.length ? `${approvedPct}% already approved by your counselor.` : country ? `Your counselor will add the checklist for ${country}. You can still upload documents.` : 'Choose a university so we can show the checklist for your country.'}</p>
          {required.length > 0 && <div className="h-2 rounded-full bg-slate-100 overflow-hidden flex"><div className="h-full bg-emerald-500" style={{ width: `${approvedPct}%` }} /><div className="h-full bg-[#58051E]/70" style={{ width: `${Math.max(0, uploadedPct - approvedPct)}%` }} /></div>}
          <div className="flex flex-wrap gap-x-4 gap-y-1 text-[11px] font-medium text-slate-500">
            <span className="inline-flex items-center gap-1"><i className="w-2 h-2 rounded-full bg-emerald-500" />Approved</span>
            <span className="inline-flex items-center gap-1"><i className="w-2 h-2 rounded-full bg-[#58051E]/70" />Uploaded, waiting</span>
            {country && <span className="inline-flex items-center gap-1"><Globe className="w-3 h-3" />{country}{workflow?.estimated_processing_days ? ` · legalization about ${workflow.estimated_processing_days}` : ''}</span>}
          </div>
        </div>
        {!country && <Link to="/student/select-university" className={btnGhost}>Choose university</Link>}
      </section>

      {needAction.length > 0 && (
        <section className="rounded-2xl border border-rose-200 bg-rose-50/70 p-4 space-y-2">
          <h2 className="text-sm font-bold text-rose-800 flex items-center gap-2"><AlertCircle className="w-4 h-4" />{needAction.length} {needAction.length === 1 ? 'document needs' : 'documents need'} a new upload</h2>
          <ul className="space-y-2">
            {needAction.map(d => (
              <li key={d.id} className="bg-white rounded-xl border border-rose-100 p-3 flex flex-col sm:flex-row sm:items-center gap-2 justify-between">
                <div className="min-w-0"><p className="text-sm font-semibold text-slate-900 truncate">{d.requirement_name || d.file_name}</p><p className="text-xs text-rose-700 mt-0.5">{d.reviewer_notes || 'Please upload a clearer copy.'}</p></div>
                <button type="button" className={btnPrimary} onClick={() => setUpload({ replaceId: d.id, req: requirements.find(r => r.id === d.requirement_id || r.document_name === d.requirement_name) })}><RefreshCw className="w-3.5 h-3.5" />Upload again</button>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Tabs */}
      <div className="flex items-center gap-1 border-b border-slate-200">
        {([['checklist', `Required documents${required.length ? ` (${required.length})` : ''}`], ['files', `All my files (${docs.length})`]] as const).map(([k, l]) => (
          <button key={k} type="button" onClick={() => setTab(k)} className={`px-4 py-2.5 text-xs font-bold border-b-2 -mb-px cursor-pointer ${tab === k ? 'border-[#58051E] text-[#58051E]' : 'border-transparent text-slate-500 hover:text-slate-800'}`}>{l}</button>
        ))}
      </div>

      {loading ? (
        <BlockCap />
      ) : tab === 'checklist' ? (
        <div className="space-y-3">
          {dossier.results.length === 0 && <EmptyState icon={ShieldCheck} title="No checklist yet" hint="When your counselor sets the document list for your country it will appear here. You can still upload any document under All my files." />}
          {dossier.results.map(({ requirement: r, status, doc }) => {
            const s: Norm | 'Missing' = status === 'Missing' ? 'Missing' : status === 'Rejected' ? 'Needs action' : (status as Norm);
            return (
              <article key={r.id} className="rounded-2xl border border-slate-200/80 bg-white p-4 flex flex-col sm:flex-row sm:items-center gap-3">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${s === 'Approved' ? 'bg-emerald-50 text-emerald-600' : s === 'Missing' ? 'bg-slate-100 text-slate-500' : 'bg-[#58051E]/8 text-[#58051E]'}`}>
                  {s === 'Approved' ? <CheckCircle2 className="w-5 h-5" /> : s === 'Missing' ? <FilePlus2 className="w-5 h-5" /> : <Clock className="w-5 h-5" />}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2"><h3 className="text-sm font-bold text-slate-900">{r.document_name}</h3>{!r.is_required && <span className="text-[10px] font-semibold text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">Optional</span>}</div>
                  {r.description && <p className="text-xs text-slate-500 mt-0.5 line-clamp-2">{r.description}</p>}
                  {doc && <p className="text-[11px] text-slate-400 mt-1 truncate">{[doc.file_name, doc.file_size, dateOf(doc.uploaded_at)].filter(Boolean).join(' · ')}</p>}
                  {s === 'Needs action' && doc?.reviewer_notes && <p className="text-xs text-rose-700 font-medium mt-1">{doc.reviewer_notes}</p>}
                </div>
                <div className="flex items-center gap-2 sm:justify-end flex-wrap"><Pill s={s} />
                  {doc && <button type="button" className={btnGhost} onClick={() => view(doc)}><Eye className="w-3.5 h-3.5" />View</button>}
                  {s === 'Missing' && <button type="button" className={btnPrimary} onClick={() => setUpload({ req: r })}><UploadCloud className="w-3.5 h-3.5" />Upload</button>}
                  {s === 'Needs action' && doc && <button type="button" className={btnPrimary} onClick={() => setUpload({ req: r, replaceId: doc.id })}><RefreshCw className="w-3.5 h-3.5" />Upload again</button>}
                  {s !== 'Missing' && s !== 'Needs action' && s !== 'Approved' && doc && <button type="button" className={btnGhost} onClick={() => setUpload({ req: r, replaceId: doc.id })}>Replace</button>}
                </div>
              </article>
            );
          })}
          {extraDocs.length > 0 && <p className="text-xs text-slate-500 pt-1">{extraDocs.length} more {extraDocs.length === 1 ? 'file is' : 'files are'} under <button type="button" className="font-bold text-[#58051E] underline cursor-pointer" onClick={() => setTab('files')}>All my files</button>.</p>}
        </div>
      ) : (
        <div className="space-y-3">
          <div className="flex flex-col sm:flex-row gap-2">
            <div className="relative flex-1"><Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" /><input value={query} onChange={e => setQuery(e.target.value)} placeholder="Search by name or type" className="w-full h-10 pl-9 pr-3" /></div>
            <select aria-label="Filter by status" value={statusFilter} onChange={e => setStatusFilter(e.target.value as any)} className="h-10 px-3 sm:w-48">
              <option value="All">All statuses</option><option value="Submitted">Waiting for review</option><option value="Under Review">Being reviewed</option><option value="Approved">Approved</option><option value="Needs action">Upload again</option>
            </select>
          </div>
          {filtered.length === 0 ? <EmptyState icon={FileText} title={docs.length ? 'No files match' : 'No files yet'} hint={docs.length ? 'Try a different search or status.' : 'Upload your first document to get started.'} /> : (
            <ul className="rounded-2xl border border-slate-200/80 bg-white divide-y divide-slate-100 overflow-hidden">
              {filtered.map(d => (
                <li key={d.id} className="p-4 flex flex-col sm:flex-row sm:items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-[#58051E]/8 text-[#58051E] flex items-center justify-center shrink-0"><FileText className="w-5 h-5" /></div>
                  <div className="min-w-0 flex-1"><p className="text-sm font-semibold text-slate-900 truncate">{d.file_name}</p><p className="text-[11px] text-slate-500">{[d.requirement_name || d.doc_type, d.file_size, dateOf(d.uploaded_at)].filter(Boolean).join(' · ')}</p>{norm(d.status) === 'Needs action' && d.reviewer_notes && <p className="text-xs text-rose-700 font-medium mt-0.5">{d.reviewer_notes}</p>}</div>
                  <div className="flex items-center gap-2 flex-wrap"><Pill s={norm(d.status)} /><button type="button" className={btnGhost} onClick={() => view(d)}><Eye className="w-3.5 h-3.5" />View</button></div>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      <DocumentUploadDialog
        open={!!upload}
        studentId={studentId}
        forStudentName={isImpersonating ? activeStudentName : undefined}
        fixedTitle={upload?.req?.document_name}
        hint={upload?.req?.description}
        onClose={() => setUpload(null)}
        onUploaded={save}
      />
      <DocumentViewer doc={viewing} onClose={() => setViewing(null)} />
    </div>
  );
};

export default Documents;
