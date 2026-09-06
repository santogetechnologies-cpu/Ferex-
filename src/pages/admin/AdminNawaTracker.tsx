import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Plus, Search, X, Trash2, CheckCircle2,
  FileText, Stamp, Globe, Edit2
} from 'lucide-react';
import { getStudents } from '../../lib/api/students';
import {
  getNawaRecords, createNawaRecord, updateNawaStep, deleteNawaRecord
} from '../../lib/api/nawa';
import { useCountryWorkflows } from '../../hooks/useCountryWorkflows';
import type { NawaRecord } from '../../lib/api/nawa';
import type { UserProfile, CountryWorkflowConfig, WorkflowStageConfig, WorkflowDocumentRequirement } from '../../lib/types';

export const AdminNawaTracker: React.FC = () => {
  const { workflows, saveWorkflow, removeWorkflow, getWorkflowForCountry } = useCountryWorkflows();

  // Active Main View Tab: 'tracking' (Student Queue) vs 'workflows' (Country Configuration)
  const [activeTab, setActiveTab] = useState<'tracking' | 'workflows'>('tracking');

  // Tracking State
  const [records, setRecords] = useState<NawaRecord[]>([]);
  const [students, setStudents] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [countryFilter, setCountryFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState('All');
  const [toast, setToast] = useState('');

  // Modal: Add Student to Legalization
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedStudentId, setSelectedStudentId] = useState('');
  const [selectedTargetCountry, setSelectedTargetCountry] = useState('Poland');
  const [nawaRefNo, setNawaRefNo] = useState('');
  const [documentType, setDocumentType] = useState('High School Diploma & Transcripts');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Modal: Delete Record
  const [deleteId, setDeleteId] = useState<string | null>(null);

  // Modal: Add / Edit Country Workflow
  const [showWorkflowModal, setShowWorkflowModal] = useState(false);
  const [editingWorkflowId, setEditingWorkflowId] = useState<string | null>(null);
  const [activeWorkflowTab, setActiveWorkflowTab] = useState<'authority' | 'stages' | 'documents' | 'visa'>('authority');

  // Workflow Form State
  const [wfCountry, setWfCountry] = useState('Poland');
  const [wfAuthorityName, setWfAuthorityName] = useState('');
  const [wfAuthorityAcronym, setWfAuthorityAcronym] = useState('');
  const [wfAuthorityBadge, setWfAuthorityBadge] = useState('');
  const [wfAuthorityDesc, setWfAuthorityDesc] = useState('');
  const [wfEstDays, setWfEstDays] = useState('14 - 21 Days');
  const [wfAuthorityFee, setWfAuthorityFee] = useState('€250');
  const [wfWebsite, setWfWebsite] = useState('');
  const [wfStages, setWfStages] = useState<WorkflowStageConfig[]>([]);
  const [wfDocs, setWfDocs] = useState<WorkflowDocumentRequirement[]>([]);
  const [wfVisaType, setWfVisaType] = useState('National Type D Student Visa (Schengen)');
  const [wfFinancialReq, setWfFinancialReq] = useState('€3,000 Bank Solvency Proof');
  const [wfInsuranceReq, setWfInsuranceReq] = useState('€30,000 Schengen Travel Health Insurance');
  const [wfAppointmentChannel, setWfAppointmentChannel] = useState('VFS Global Center');
  const [wfInterviewRequired, setWfInterviewRequired] = useState(true);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(''), 3000);
  };

  const loadData = async () => {
    setLoading(true);
    try {
      const [recs, stds] = await Promise.all([getNawaRecords(), getStudents()]);
      setRecords(recs);
      setStudents(stds);
    } catch (e) {
      console.warn('Load Legalization data error:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    window.addEventListener('ferex_nawa_change', loadData);
    return () => window.removeEventListener('ferex_nawa_change', loadData);
  }, []);

  const handleOpenAddModal = () => {
    setSelectedStudentId(students[0]?.id || '');
    setSelectedTargetCountry(workflows[0]?.country || 'Poland');
    setNawaRefNo('');
    setDocumentType('Academic Diploma & Transcripts');
    setNotes('');
    setShowAddModal(true);
  };

  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStudentId) {
      showToast('Please select a student.');
      return;
    }

    try {
      setIsSubmitting(true);
      const studentObj = students.find(s => s.id === selectedStudentId);
      const targetWorkflow = getWorkflowForCountry(selectedTargetCountry);
      const refPrefix = targetWorkflow.authority_acronym.toUpperCase().replace(/[^A-Z]/g, '').slice(0, 4) || 'AUTH';
      const autoRef = nawaRefNo.trim() || `${refPrefix}/${selectedTargetCountry.slice(0, 3).toUpperCase()}/2026/${Math.floor(1000 + Math.random() * 9000)}`;

      const newRec = await createNawaRecord({
        student_id: selectedStudentId,
        student_name: studentObj?.full_name || studentObj?.email?.split('@')[0] || 'Student',
        student_email: studentObj?.email,
        nawa_ref_no: autoRef,
        document_type: `${selectedTargetCountry} - ${documentType} (${targetWorkflow.authority_acronym})`,
        notes: notes.trim() || `Initiated ${targetWorkflow.authority_name} legalization and document audit.`,
      });

      setRecords(prev => [newRec, ...prev]);
      setShowAddModal(false);
      showToast(`Student ${newRec.student_name} added to ${targetWorkflow.authority_acronym} Legalization queue!`);
    } catch (err: any) {
      showToast(`Error adding student: ${err.message || 'Failed'}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleStepChange = async (id: string, step: number, status: NawaRecord['status']) => {
    try {
      const updated = await updateNawaStep(id, step, status);
      if (updated) {
        setRecords(prev => prev.map(r => r.id === id ? updated : r));
        showToast(`Updated verification progress for ${updated.student_name} to Step ${step} (${status}).`);
      }
    } catch (e) {
      showToast('Failed to update step.');
    }
  };

  const handleDeleteRecord = async () => {
    if (!deleteId) return;
    try {
      await deleteNawaRecord(deleteId);
      const cleanId = deleteId.replace('nawa-app-', '').replace('nawa-std-', '');
      setRecords(prev => prev.filter(r => r.id !== deleteId && r.id !== cleanId && r.student_id !== cleanId));
      setDeleteId(null);
      showToast('🎉 Legalization record permanently removed.');
    } catch (e) {
      showToast('Could not remove record.');
    }
  };

  // Workflow Modal Openers
  const handleOpenNewWorkflowModal = () => {
    setEditingWorkflowId(null);
    setWfCountry('');
    setWfAuthorityName('');
    setWfAuthorityAcronym('');
    setWfAuthorityBadge('Academic Legalization');
    setWfAuthorityDesc('');
    setWfEstDays('14 - 21 Days');
    setWfAuthorityFee('€200');
    setWfWebsite('');
    setWfStages([
      { step_number: 1, title: 'Academic Profile Audit & Certified Translation', short_name: 'Document Audit', description: 'Initial transcript evaluation and sworn translations.', responsible_party: 'ferex_admin', required_docs: ['Transcripts', 'Degree', 'Passport'], estimated_days: '3-5 Days', auto_unlocks_next: true },
      { step_number: 2, title: 'Authority Legalization & Equivalency Filing', short_name: 'Authority Filing', description: 'Direct submission to national education authority.', responsible_party: 'authority', required_docs: ['Apostille Certificate', 'Application Dossier'], estimated_days: '14-21 Days', auto_unlocks_next: true },
      { step_number: 3, title: 'University Acceptance & Tuition Deposit', short_name: 'University Offer', description: 'Admission offer release and tuition IBAN payment.', responsible_party: 'university', required_docs: ['Offer Letter', 'Swift Payment'], estimated_days: '5-7 Days', auto_unlocks_next: true },
      { step_number: 4, title: 'Consular Visa Filing & Embassy Mock Interview', short_name: 'Visa Filing', description: 'VFS/Embassy appointment booking and file compilation.', responsible_party: 'student', required_docs: ['Bank Proof', 'Insurance'], estimated_days: '15-20 Days', auto_unlocks_next: true },
      { step_number: 5, title: 'National D Student Visa Grant & Stamping', short_name: 'Visa Stamped', description: 'Passport visa stamping and post-arrival onboarding.', responsible_party: 'ferex_admin', required_docs: ['Stamped Visa Passport'], estimated_days: '3-5 Days', auto_unlocks_next: false }
    ]);
    setWfDocs([
      { id: 'doc-1', name: 'Valid International Passport', category: 'identity', is_mandatory: true, instructions: 'Color copy of all pages.' },
      { id: 'doc-2', name: 'Academic Transcripts & Degree Diplomas', category: 'academic', is_mandatory: true, instructions: 'Official attested transcripts.' },
      { id: 'doc-3', name: 'Apostille Certificate (MEA)', category: 'legalization', is_mandatory: true, instructions: 'Ministry Apostille verification.' },
      { id: 'doc-4', name: 'Bank Solvency Financial Statement', category: 'financial', is_mandatory: true, instructions: 'Proof of sufficient living funds.' }
    ]);
    setWfVisaType('National D Student Visa');
    setWfFinancialReq('€3,000 - €5,000 Bank Solvency Proof');
    setWfInsuranceReq('€30,000 Comprehensive Schengen Medical Insurance');
    setWfAppointmentChannel('VFS Global Application Center');
    setWfInterviewRequired(true);
    setActiveWorkflowTab('authority');
    setShowWorkflowModal(true);
  };

  const handleOpenEditWorkflowModal = (wf: CountryWorkflowConfig) => {
    setEditingWorkflowId(wf.id);
    setWfCountry(wf.country);
    setWfAuthorityName(wf.authority_name);
    setWfAuthorityAcronym(wf.authority_acronym);
    setWfAuthorityBadge(wf.authority_badge);
    setWfAuthorityDesc(wf.authority_description);
    setWfEstDays(wf.estimated_processing_days);
    setWfAuthorityFee(wf.authority_fee);
    setWfWebsite(wf.website_url || '');
    setWfStages(wf.stages || []);
    setWfDocs(wf.checklist_documents || []);
    setWfVisaType(wf.visa_procedures?.visa_type || 'National D Student Visa');
    setWfFinancialReq(wf.visa_procedures?.financial_proof_req || '€3,000 Bank Solvency Proof');
    setWfInsuranceReq(wf.visa_procedures?.insurance_req || '€30,000 Medical Insurance');
    setWfAppointmentChannel(wf.visa_procedures?.appointment_channel || 'VFS Global');
    setWfInterviewRequired(wf.visa_procedures?.interview_required ?? true);
    setActiveWorkflowTab('authority');
    setShowWorkflowModal(true);
  };

  const handleSaveWorkflow = (e: React.FormEvent) => {
    e.preventDefault();
    if (!wfCountry.trim() || !wfAuthorityName.trim()) {
      showToast('Country and Authority name are required.');
      return;
    }

    const payload: CountryWorkflowConfig = {
      id: editingWorkflowId || `wf-${wfCountry.toLowerCase().replace(/\s+/g, '-')}`,
      country: wfCountry.trim(),
      authority_name: wfAuthorityName.trim(),
      authority_acronym: wfAuthorityAcronym.trim() || wfAuthorityName.slice(0, 4).toUpperCase(),
      authority_badge: wfAuthorityBadge.trim() || `${wfCountry} Legalization`,
      authority_description: wfAuthorityDesc.trim() || `Official verification and visa procedure for ${wfCountry}.`,
      estimated_processing_days: wfEstDays.trim() || '14 - 21 Days',
      authority_fee: wfAuthorityFee.trim() || '€200',
      website_url: wfWebsite.trim(),
      is_active: true,
      stages: wfStages,
      checklist_documents: wfDocs,
      visa_procedures: {
        visa_type: wfVisaType,
        financial_proof_req: wfFinancialReq,
        insurance_req: wfInsuranceReq,
        appointment_channel: wfAppointmentChannel,
        interview_required: wfInterviewRequired,
      }
    };

    saveWorkflow(payload);
    setShowWorkflowModal(false);
    showToast(`Workflow for ${wfCountry} (${payload.authority_acronym}) saved & synchronized across portal!`);
  };

  // Helper to extract student country
  const resolveStudentCountry = (record: NawaRecord): string => {
    for (const wf of workflows) {
      if (record.document_type.toLowerCase().includes(wf.country.toLowerCase()) || record.document_type.toLowerCase().includes(wf.authority_acronym.toLowerCase())) {
        return wf.country;
      }
    }
    return 'Poland';
  };

  // Filtered tracking list
  const filtered = records.filter(r => {
    const q = search.toLowerCase().trim();
    const nameMatch = (r.student_name || '').toLowerCase().includes(q) || (r.nawa_ref_no || '').toLowerCase().includes(q) || (r.document_type || '').toLowerCase().includes(q);
    const country = resolveStudentCountry(r);
    const countryMatch = countryFilter === 'All' || country === countryFilter;
    const statusMatch = statusFilter === 'All' || r.status === statusFilter;
    return nameMatch && countryMatch && statusMatch;
  });

  return (
    <div className="space-y-6 text-left relative">
      {/* Toast */}
      {toast && (
        <div className="fixed top-6 right-6 z-50 bg-[#50001D] text-white px-5 py-3.5 rounded-xl shadow-2xl text-xs font-bold flex items-center gap-3">
          <CheckCircle2 className="w-5 h-5 text-emerald-400" /> {toast}
        </div>
      )}

      {/* Header with Switcher Tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-black text-slate-900 tracking-tight">
              Country Workflows & Legalization Management
            </h1>
            <span className="text-[10px] font-black uppercase tracking-wider bg-[#50001D]/10 text-[#50001D] px-2.5 py-0.5 rounded-md border border-[#50001D]/20">
              SuperAdmin Config
            </span>
          </div>
          <p className="text-xs font-semibold text-slate-400 mt-1">
            Configure country-specific legalization bodies (Poland NAWA, Germany APS, Italy CIMEA, Czech Nostrification, France Campus France, Spain UNEDasiss), customized workflow stages, document checklists, and visa procedures.
          </p>
        </div>

        {/* Tab Switcher */}
        <div className="p-1 bg-slate-100 rounded-xl flex items-center gap-1 border border-slate-200 self-start sm:self-auto">
          <button
            onClick={() => setActiveTab('tracking')}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'tracking'
                ? 'bg-[#50001D] text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Student Legalization Queue ({records.length})
          </button>
          <button
            onClick={() => setActiveTab('workflows')}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'workflows'
                ? 'bg-[#50001D] text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Country Workflows ({workflows.length})
          </button>
        </div>
      </div>

      {/* ──────────────── TAB 1: STUDENT LEGALIZATION QUEUE ─────────────────── */}
      {activeTab === 'tracking' && (
        <div className="space-y-5">
          {/* Controls Bar */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white p-3.5 rounded-2xl border border-slate-200 shadow-xs">
            <div className="relative flex-1">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by student name, reference ID, or document type..."
                className="w-full h-9.5 pl-9 pr-3.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:outline-none focus:border-[#50001D]"
              />
            </div>

            <div className="flex items-center gap-2">
              <select
                value={countryFilter}
                onChange={(e) => setCountryFilter(e.target.value)}
                className="h-9.5 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:outline-none cursor-pointer"
              >
                <option value="All">All Countries</option>
                {workflows.map(w => (
                  <option key={w.id} value={w.country}>{w.country} ({w.authority_acronym})</option>
                ))}
              </select>

              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="h-9.5 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:outline-none cursor-pointer"
              >
                <option value="All">All Statuses</option>
                <option value="Submitted">Submitted</option>
                <option value="In Review">In Review</option>
                <option value="Approved">Approved</option>
                <option value="Rejected">Rejected</option>
              </select>

              <button
                onClick={handleOpenAddModal}
                className="h-9.5 px-4 bg-[#50001D] hover:bg-[#3D0016] text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all cursor-pointer whitespace-nowrap"
              >
                <Plus className="w-4 h-4" />
                <span>Add Student to Queue</span>
              </button>
            </div>
          </div>

          {/* Records Table / Cards */}
          {loading ? (
            <div className="py-16 text-center text-xs font-bold text-slate-400">Loading student legalization applications...</div>
          ) : filtered.length === 0 ? (
            <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center shadow-xs">
              <Stamp className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <h3 className="text-sm font-black text-slate-800">No Legalization Records Found</h3>
              <p className="text-xs font-semibold text-slate-400 mt-1 max-w-sm mx-auto">
                No active students match this filter. Click "Add Student to Queue" to initiate a country legalization process.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {filtered.map(rec => {
                const country = resolveStudentCountry(rec);
                const wf = getWorkflowForCountry(country);
                const maxSteps = wf.stages?.length || 5;
                const currentStageObj = wf.stages?.[rec.current_step - 1] || wf.stages?.[0];

                return (
                  <motion.div
                    key={rec.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-xs hover:shadow-md transition-all flex flex-col justify-between text-left group"
                  >
                    <div>
                      {/* Top Header */}
                      <div className="flex items-start justify-between gap-3 mb-3">
                        <div>
                          <div className="flex items-center gap-1.5 mb-1">
                            <span className="text-[10px] font-black uppercase bg-slate-100 text-slate-800 px-2 py-0.5 rounded border border-slate-200">
                              {country}
                            </span>
                            <span className="text-[10px] font-black uppercase bg-[#50001D]/10 text-[#50001D] px-2 py-0.5 rounded border border-[#50001D]/20">
                              {wf.authority_acronym}
                            </span>
                          </div>
                          <h3 className="text-sm font-black text-slate-900 group-hover:text-[#50001D] transition-colors">
                            {rec.student_name}
                          </h3>
                          <p className="text-[11px] font-semibold text-slate-400 font-mono">
                            Ref: {rec.nawa_ref_no}
                          </p>
                        </div>

                        <span className={`text-[10px] font-black px-2.5 py-1 rounded-full ${
                          rec.status === 'Approved'
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : rec.status === 'Rejected'
                            ? 'bg-red-50 text-red-700 border border-red-200'
                            : 'bg-amber-50 text-amber-800 border border-amber-200'
                        }`}>
                          {rec.status}
                        </span>
                      </div>

                      {/* Document Type & Notes */}
                      <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/60 space-y-1.5 text-xs my-3">
                        <div className="text-[11px] font-bold text-slate-800 flex items-center gap-1.5">
                          <FileText className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span className="truncate">{rec.document_type}</span>
                        </div>
                        {rec.notes && (
                          <p className="text-[10.5px] text-slate-500 line-clamp-2 leading-relaxed">
                            {rec.notes}
                          </p>
                        )}
                      </div>

                      {/* Step Progress Bar */}
                      <div className="space-y-1.5 my-3">
                        <div className="flex items-center justify-between text-[11px] font-bold">
                          <span className="text-slate-500">
                            Stage {rec.current_step} of {maxSteps}:
                          </span>
                          <span className="text-[#50001D] font-black">
                            {currentStageObj?.short_name || currentStageObj?.title || `Step ${rec.current_step}`}
                          </span>
                        </div>

                        <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden flex gap-0.5">
                          {Array.from({ length: maxSteps }).map((_, idx) => (
                            <div
                              key={idx}
                              className={`flex-1 h-full transition-all ${
                                idx + 1 <= rec.current_step
                                  ? rec.status === 'Approved' ? 'bg-emerald-500' : 'bg-[#50001D]'
                                  : 'bg-slate-200'
                              }`}
                            />
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* Step Controls */}
                    <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1">
                        {rec.current_step < maxSteps && (
                          <button
                            onClick={() => handleStepChange(rec.id, rec.current_step + 1, 'In Review')}
                            className="text-[10.5px] font-bold text-[#50001D] bg-[#50001D]/5 hover:bg-[#50001D]/10 px-2.5 py-1 rounded-lg border border-[#50001D]/20 cursor-pointer"
                          >
                            Advance Step →
                          </button>
                        )}
                        {rec.status !== 'Approved' && (
                          <button
                            onClick={() => handleStepChange(rec.id, maxSteps, 'Approved')}
                            className="text-[10.5px] font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 px-2.5 py-1 rounded-lg border border-emerald-200 cursor-pointer"
                          >
                            Mark Approved ✓
                          </button>
                        )}
                      </div>

                      <button
                        onClick={() => setDeleteId(rec.id)}
                        title="Remove Record"
                        className="p-1.5 rounded-lg text-slate-300 hover:text-red-600 hover:bg-red-50 cursor-pointer"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ──────────────── TAB 2: COUNTRY WORKFLOWS & PROCEDURES CONFIGURATOR ── */}
      {activeTab === 'workflows' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-gradient-to-r from-[#50001D] via-[#6A1B2E] to-[#50001D] text-white p-6 rounded-3xl shadow-xl">
            <div className="space-y-1">
              <h2 className="text-base sm:text-lg font-black tracking-tight flex items-center gap-2">
                <Globe className="w-5 h-5 text-amber-300" />
                Custom European Country Workflows & Legalization Procedures
              </h2>
              <p className="text-xs text-rose-100/80 max-w-2xl">
                SuperAdmin can customize country-specific verification bodies (NAWA, APS, CIMEA, Nostrification, Campus France, etc.), custom stage steps, mandatory document checklists, and visa procedures.
              </p>
            </div>

            <button
              onClick={handleOpenNewWorkflowModal}
              className="h-10 px-5 bg-white hover:bg-rose-50 text-[#50001D] rounded-xl text-xs font-black flex items-center gap-2 shadow-lg transition-all cursor-pointer whitespace-nowrap self-start sm:self-auto"
            >
              <Plus className="w-4 h-4 text-[#50001D]" />
              <span>Add Country Workflow</span>
            </button>
          </div>

          {/* Workflows Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {workflows.map(wf => (
              <motion.div
                key={wf.id}
                whileHover={{ y: -2 }}
                className="bg-white border border-slate-200/80 rounded-3xl p-6 shadow-xs hover:shadow-lg transition-all flex flex-col justify-between text-left space-y-5"
              >
                <div>
                  {/* Top Bar */}
                  <div className="flex items-start justify-between gap-3 border-b border-slate-100 pb-3.5">
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-base font-black text-slate-900">{wf.country}</h3>
                        <span className="text-[10px] font-black uppercase tracking-wider bg-[#50001D] text-amber-300 px-2 py-0.5 rounded-md">
                          {wf.authority_acronym}
                        </span>
                      </div>
                      <p className="text-xs font-semibold text-slate-500 mt-0.5">
                        {wf.authority_name}
                      </p>
                    </div>

                    <span className="text-xs font-black text-slate-700 bg-slate-100 px-2.5 py-1 rounded-xl">
                      {wf.authority_fee}
                    </span>
                  </div>

                  {/* Description */}
                  <p className="text-xs text-slate-600 leading-relaxed my-3 line-clamp-2">
                    {wf.authority_description}
                  </p>

                  {/* Key Stats Row */}
                  <div className="grid grid-cols-2 gap-2 my-3 p-3 bg-slate-50 rounded-2xl border border-slate-200/70 text-xs">
                    <div>
                      <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block">Duration:</span>
                      <span className="font-bold text-slate-800">{wf.estimated_processing_days}</span>
                    </div>
                    <div>
                      <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block">Stages:</span>
                      <span className="font-bold text-[#50001D]">{wf.stages?.length || 5} Step Flow</span>
                    </div>
                  </div>

                  {/* Stage Preview Chips */}
                  <div className="space-y-1.5 my-3">
                    <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block">
                      Roadmap Steps:
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {wf.stages?.map(st => (
                        <span key={st.step_number} className="text-[10px] font-bold bg-slate-100 text-slate-700 px-2 py-0.5 rounded-md border border-slate-200">
                          #{st.step_number} {st.short_name}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Card Actions */}
                <div className="pt-4 border-t border-slate-100 flex items-center justify-between gap-2">
                  <button
                    onClick={() => handleOpenEditWorkflowModal(wf)}
                    className="flex-1 h-9 bg-[#50001D] hover:bg-[#3D0016] text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <Edit2 className="w-3.5 h-3.5 text-amber-300" />
                    <span>Configure Workflow & Stages</span>
                  </button>

                  {workflows.length > 1 && (
                    <button
                      onClick={() => {
                        if (confirm(`Remove workflow for ${wf.country}?`)) {
                          removeWorkflow(wf.id);
                          showToast(`Workflow for ${wf.country} removed.`);
                        }
                      }}
                      title="Delete Workflow"
                      className="h-9 px-3 border border-slate-200 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-colors cursor-pointer"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      )}

      {/* ──────────────── MODAL 1: ADD STUDENT TO QUEUE ──────────────────────── */}
      <AnimatePresence>
        {showAddModal && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-50" onClick={() => setShowAddModal(false)} />
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-lg bg-white rounded-3xl shadow-2xl z-50 border border-slate-200 p-6 sm:p-7 text-left">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
                <div>
                  <h3 className="text-base font-black text-slate-900">Add Student to Legalization Process</h3>
                  <p className="text-xs font-semibold text-slate-400">Initiate qualification verification according to destination country workflow.</p>
                </div>
                <button onClick={() => setShowAddModal(false)} className="p-1.5 rounded-full hover:bg-slate-100 text-slate-400 cursor-pointer">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleAddSubmit} className="space-y-4">
                <div>
                  <label className="block text-[10px] font-extrabold uppercase text-slate-400 tracking-wider mb-1">Select Student *</label>
                  <select
                    required
                    value={selectedStudentId}
                    onChange={(e) => setSelectedStudentId(e.target.value)}
                    className="w-full h-10 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:outline-none cursor-pointer"
                  >
                    {students.map(s => (
                      <option key={s.id} value={s.id}>{s.full_name || s.email} ({s.email})</option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-extrabold uppercase text-slate-400 tracking-wider mb-1">Destination Country *</label>
                    <select
                      value={selectedTargetCountry}
                      onChange={(e) => setSelectedTargetCountry(e.target.value)}
                      className="w-full h-10 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:outline-none cursor-pointer"
                    >
                      {workflows.map(w => (
                        <option key={w.id} value={w.country}>{w.country} ({w.authority_acronym})</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[10px] font-extrabold uppercase text-slate-400 tracking-wider mb-1">Custom Ref No (Optional)</label>
                    <input
                      type="text"
                      value={nawaRefNo}
                      onChange={(e) => setNawaRefNo(e.target.value)}
                      placeholder="Auto-generated if blank"
                      className="w-full h-10 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-extrabold uppercase text-slate-400 tracking-wider mb-1">Document Types</label>
                  <input
                    type="text"
                    value={documentType}
                    onChange={(e) => setDocumentType(e.target.value)}
                    placeholder="e.g. 10th/12th Marksheets, Bachelor Transcripts"
                    className="w-full h-10 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-extrabold uppercase text-slate-400 tracking-wider mb-1">Initial Audit Notes</label>
                  <textarea
                    rows={2}
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Notes on translation, apostille, or specific university requirements..."
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:outline-none resize-none"
                  />
                </div>

                <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-3">
                  <button type="button" onClick={() => setShowAddModal(false)} className="h-10 px-4 border border-slate-200 text-xs font-bold text-slate-600 rounded-xl hover:bg-slate-50 cursor-pointer">Cancel</button>
                  <button type="submit" disabled={isSubmitting} className="h-10 px-6 bg-[#50001D] text-white text-xs font-bold rounded-xl hover:bg-[#3D0016] shadow-sm cursor-pointer disabled:opacity-50">
                    {isSubmitting ? 'Initiating Process...' : 'Add to Legalization Queue'}
                  </button>
                </div>
              </form>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* ──────────────── MODAL 2: CONFIGURE COUNTRY WORKFLOW ───────────────── */}
      <AnimatePresence>
        {showWorkflowModal && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs z-50" onClick={() => setShowWorkflowModal(false)} />
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-2xl bg-white rounded-3xl shadow-2xl z-50 border border-slate-200 p-6 sm:p-7 max-h-[88vh] overflow-y-auto text-left">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
                <div>
                  <h3 className="text-base font-black text-slate-900">
                    {editingWorkflowId ? `Configure ${wfCountry} Workflow & Procedures` : 'Create New Country Workflow'}
                  </h3>
                  <p className="text-xs font-semibold text-slate-400">Customize the verification authority, step roadmap, document checklist, and visa rules.</p>
                </div>
                <button onClick={() => setShowWorkflowModal(false)} className="p-1.5 rounded-full hover:bg-slate-100 text-slate-400 cursor-pointer">
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Navigation Tabs in Modal */}
              <div className="flex items-center gap-2 border-b border-slate-100 pb-3 mb-4 overflow-x-auto">
                {[
                  { id: 'authority', label: '1. Legalization Authority' },
                  { id: 'stages', label: '2. Workflow Stages (Roadmap)' },
                  { id: 'documents', label: '3. Mandatory Checklist' },
                  { id: 'visa', label: '4. Visa Requirements' },
                ].map(tab => (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setActiveWorkflowTab(tab.id as any)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
                      activeWorkflowTab === tab.id
                        ? 'bg-[#50001D] text-white shadow-xs'
                        : 'bg-slate-50 text-slate-600 hover:bg-slate-100 border border-slate-200'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              <form onSubmit={handleSaveWorkflow} className="space-y-4">
                {/* TAB 1: Authority */}
                {activeWorkflowTab === 'authority' && (
                  <div className="space-y-3.5">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[10px] font-extrabold uppercase text-slate-400 tracking-wider mb-1">Country Name *</label>
                        <input
                          required
                          type="text"
                          value={wfCountry}
                          onChange={(e) => setWfCountry(e.target.value)}
                          placeholder="e.g. Poland, Germany, Italy, Switzerland"
                          className="w-full h-9.5 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:outline-none"
                        />
                      </div>

                      <div>
                        <label className="block text-[10px] font-extrabold uppercase text-slate-400 tracking-wider mb-1">Authority Acronym *</label>
                        <input
                          required
                          type="text"
                          value={wfAuthorityAcronym}
                          onChange={(e) => setWfAuthorityAcronym(e.target.value)}
                          placeholder="e.g. NAWA, APS, CIMEA, Nostrification"
                          className="w-full h-9.5 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:outline-none"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-[10px] font-extrabold uppercase text-slate-400 tracking-wider mb-1">Full Legalization Authority Name *</label>
                      <input
                        required
                        type="text"
                        value={wfAuthorityName}
                        onChange={(e) => setWfAuthorityName(e.target.value)}
                        placeholder="e.g. Polish National Agency for Academic Exchange (NAWA)"
                        className="w-full h-9.5 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:outline-none"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[10px] font-extrabold uppercase text-slate-400 tracking-wider mb-1">Authority Processing Fee</label>
                        <input
                          type="text"
                          value={wfAuthorityFee}
                          onChange={(e) => setWfAuthorityFee(e.target.value)}
                          placeholder="e.g. €250 or ₹18,500"
                          className="w-full h-9.5 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:outline-none"
                        />
                      </div>

                      <div>
                        <label className="block text-[10px] font-extrabold uppercase text-slate-400 tracking-wider mb-1">Estimated Processing Duration</label>
                        <input
                          type="text"
                          value={wfEstDays}
                          onChange={(e) => setWfEstDays(e.target.value)}
                          placeholder="e.g. 14 - 21 Days"
                          className="w-full h-9.5 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:outline-none"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-[10px] font-extrabold uppercase text-slate-400 tracking-wider mb-1">Authority Description & Mandate</label>
                      <textarea
                        rows={2}
                        value={wfAuthorityDesc}
                        onChange={(e) => setWfAuthorityDesc(e.target.value)}
                        placeholder="Overview of the government equivalency requirement and apostille procedures..."
                        className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:outline-none resize-none"
                      />
                    </div>
                  </div>
                )}

                {/* TAB 2: Workflow Stages */}
                {activeWorkflowTab === 'stages' && (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-semibold text-slate-500">
                        Configure customized workflow milestones reflected in the student journey tracker and admin queue.
                      </p>
                      <button
                        type="button"
                        onClick={() => {
                          const nextNum = wfStages.length + 1;
                          setWfStages(prev => [
                            ...prev,
                            {
                              step_number: nextNum,
                              title: `Stage ${nextNum}: New Milestone`,
                              short_name: `Step ${nextNum}`,
                              description: 'Milestone description and requirements.',
                              responsible_party: 'ferex_admin',
                              required_docs: ['Relevant Document'],
                              estimated_days: '5-7 Days',
                              auto_unlocks_next: true
                            }
                          ]);
                        }}
                        className="h-8 px-3 bg-[#50001D] text-white text-xs font-bold rounded-xl flex items-center gap-1 cursor-pointer"
                      >
                        <Plus className="w-3.5 h-3.5" /> Add Step
                      </button>
                    </div>

                    <div className="space-y-3">
                      {wfStages.map((st, idx) => (
                        <div key={idx} className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] font-black uppercase text-[#50001D]">Stage #{idx + 1}</span>
                            {wfStages.length > 1 && (
                              <button
                                type="button"
                                onClick={() => setWfStages(prev => prev.filter((_, i) => i !== idx).map((s, i) => ({ ...s, step_number: i + 1 })))}
                                className="text-slate-400 hover:text-red-600"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            <input
                              type="text"
                              value={st.title}
                              onChange={(e) => {
                                const val = e.target.value;
                                setWfStages(prev => prev.map((s, i) => i === idx ? { ...s, title: val } : s));
                              }}
                              placeholder="Full Stage Title"
                              className="h-8 px-2.5 bg-white border border-slate-200 rounded-lg text-xs font-semibold"
                            />
                            <input
                              type="text"
                              value={st.short_name}
                              onChange={(e) => {
                                const val = e.target.value;
                                setWfStages(prev => prev.map((s, i) => i === idx ? { ...s, short_name: val } : s));
                              }}
                              placeholder="Short Badge Name"
                              className="h-8 px-2.5 bg-white border border-slate-200 rounded-lg text-xs font-semibold"
                            />
                          </div>

                          <input
                            type="text"
                            value={st.description}
                            onChange={(e) => {
                              const val = e.target.value;
                              setWfStages(prev => prev.map((s, i) => i === idx ? { ...s, description: val } : s));
                            }}
                            placeholder="Description of actions and verification..."
                            className="w-full h-8 px-2.5 bg-white border border-slate-200 rounded-lg text-xs font-semibold"
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* TAB 3: Document Checklist */}
                {activeWorkflowTab === 'documents' && (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-semibold text-slate-500">
                        Mandatory documents required by this country's university & visa authorities.
                      </p>
                      <button
                        type="button"
                        onClick={() => {
                          const nextId = 'doc_' + Date.now();
                          setWfDocs(prev => [
                            ...prev,
                            { id: nextId, name: 'New Required Document', category: 'academic', is_mandatory: true, instructions: 'Document upload instructions.' }
                          ]);
                        }}
                        className="h-8 px-3 bg-[#50001D] text-white text-xs font-bold rounded-xl flex items-center gap-1 cursor-pointer"
                      >
                        <Plus className="w-3.5 h-3.5" /> Add Requirement
                      </button>
                    </div>

                    <div className="space-y-2.5">
                      {wfDocs.map((d, idx) => (
                        <div key={d.id || idx} className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                          <div className="flex items-center justify-between gap-2">
                            <input
                              type="text"
                              value={d.name}
                              onChange={(e) => {
                                const val = e.target.value;
                                setWfDocs(prev => prev.map((item, i) => i === idx ? { ...item, name: val } : item));
                              }}
                              placeholder="Document Name (e.g. APS Certificate)"
                              className="flex-1 h-8 px-2.5 bg-white border border-slate-200 rounded-lg text-xs font-bold"
                            />
                            <button
                              type="button"
                              onClick={() => setWfDocs(prev => prev.filter((_, i) => i !== idx))}
                              className="text-slate-400 hover:text-red-600"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>

                          <input
                            type="text"
                            value={d.instructions}
                            onChange={(e) => {
                              const val = e.target.value;
                              setWfDocs(prev => prev.map((item, i) => i === idx ? { ...item, instructions: val } : item));
                            }}
                            placeholder="Upload guidelines for students..."
                            className="w-full h-8 px-2.5 bg-white border border-slate-200 rounded-lg text-[11px] font-semibold"
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* TAB 4: Visa Procedures */}
                {activeWorkflowTab === 'visa' && (
                  <div className="space-y-3.5">
                    <div>
                      <label className="block text-[10px] font-extrabold uppercase text-slate-400 tracking-wider mb-1">National Study Visa Category</label>
                      <input
                        type="text"
                        value={wfVisaType}
                        onChange={(e) => setWfVisaType(e.target.value)}
                        placeholder="e.g. National Type D Student Visa (Schengen Area)"
                        className="w-full h-9.5 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:outline-none"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[10px] font-extrabold uppercase text-slate-400 tracking-wider mb-1">Financial Solvency Requirement</label>
                        <input
                          type="text"
                          value={wfFinancialReq}
                          onChange={(e) => setWfFinancialReq(e.target.value)}
                          placeholder="e.g. €11,208 Blocked Account or €3,500 Bank Statement"
                          className="w-full h-9.5 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:outline-none"
                        />
                      </div>

                      <div>
                        <label className="block text-[10px] font-extrabold uppercase text-slate-400 tracking-wider mb-1">Schengen Medical Insurance Cover</label>
                        <input
                          type="text"
                          value={wfInsuranceReq}
                          onChange={(e) => setWfInsuranceReq(e.target.value)}
                          placeholder="e.g. €30,000 Schengen Medical Insurance"
                          className="w-full h-9.5 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:outline-none"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-[10px] font-extrabold uppercase text-slate-400 tracking-wider mb-1">Embassy / Visa Center Channel</label>
                      <input
                        type="text"
                        value={wfAppointmentChannel}
                        onChange={(e) => setWfAppointmentChannel(e.target.value)}
                        placeholder="e.g. VFS Global Center / Embassy Consular Section"
                        className="w-full h-9.5 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:outline-none"
                      />
                    </div>
                  </div>
                )}

                <div className="pt-4 border-t border-slate-100 flex items-center justify-between gap-3">
                  <button type="button" onClick={() => setShowWorkflowModal(false)} className="h-10 px-4 border border-slate-200 text-xs font-bold text-slate-600 rounded-xl hover:bg-slate-50 cursor-pointer">
                    Cancel
                  </button>
                  <button type="submit" className="h-10 px-6 bg-[#50001D] text-white text-xs font-bold rounded-xl hover:bg-[#3D0016] shadow-sm cursor-pointer">
                    {editingWorkflowId ? 'Save & Sync Workflow Across System' : 'Publish Country Workflow'}
                  </button>
                </div>
              </form>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* ──────────────── MODAL 3: DELETE CONFIRMATION ──────────────────────── */}
      <AnimatePresence>
        {deleteId && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-50" onClick={() => setDeleteId(null)} />
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-sm bg-white rounded-3xl shadow-2xl z-50 border border-slate-200 p-6 text-left">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-2xl bg-red-50 text-red-600 flex items-center justify-center">
                  <Trash2 className="w-5 h-5" />
                </div>
                <h3 className="text-sm font-black text-slate-900">Remove Legalization Record?</h3>
              </div>
              <p className="text-xs font-semibold text-slate-500 mb-5">
                This will remove the student from the active legalization queue.
              </p>
              <div className="flex gap-3">
                <button onClick={() => setDeleteId(null)} className="flex-1 h-9.5 border border-slate-200 text-xs font-bold text-slate-600 rounded-xl hover:bg-slate-50 cursor-pointer">Cancel</button>
                <button onClick={handleDeleteRecord} className="flex-1 h-9.5 bg-red-600 text-white text-xs font-bold rounded-xl hover:bg-red-700 cursor-pointer">Delete</button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};
