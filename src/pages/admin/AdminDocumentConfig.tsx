import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FileText, Plus, Search, Edit2, Trash2, CheckCircle2,
  AlertCircle, Globe, Shield, Clock, DollarSign, ListChecks,
  RotateCcw, Sparkles, X, ChevronRight, Filter, ExternalLink
} from 'lucide-react';
import {
  getAllDocumentRequirements,
  getDocumentRequirements,
  addDocumentRequirement,
  updateDocumentRequirement,
  removeDocumentRequirement,
  resetDocumentRequirementsToDefaults,
  type DocumentRequirement
} from '../../lib/api/documentRequirements';
import { getDestinations, type DestinationItem } from '../../lib/api/destinations';

const DOC_TYPES = [
  'Identification',
  'Academic',
  'Attestation',
  'Legalization',
  'Financial',
  'Language',
  'Insurance',
  'Medical',
  'Consular',
  'General'
];

export const AdminDocumentConfig: React.FC = () => {
  const [requirements, setRequirements] = useState<DocumentRequirement[]>([]);
  const [destinations, setDestinations] = useState<DestinationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCountry, setSelectedCountry] = useState<string>('Poland');
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('All');
  const [requiredFilter, setRequiredFilter] = useState<'All' | 'Required' | 'Optional'>('All');

  // Modal state
  const [showModal, setShowModal] = useState(false);
  const [editingDoc, setEditingDoc] = useState<DocumentRequirement | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  // Form State
  const [formCountry, setFormCountry] = useState('Poland');
  const [formDocName, setFormDocName] = useState('');
  const [formDocType, setFormDocType] = useState('Academic');
  const [formIsRequired, setFormIsRequired] = useState(true);
  const [formDescription, setFormDescription] = useState('');
  const [formProcessingTime, setFormProcessingTime] = useState('3 - 7 Days');
  const [formAuthorityFee, setFormAuthorityFee] = useState('Free');
  const [formChecklistItems, setFormChecklistItems] = useState<string[]>(['']);

  const loadData = async () => {
    setLoading(true);
    try {
      const [allReqs, allDests] = await Promise.all([
        getAllDocumentRequirements(),
        getDestinations()
      ]);
      setRequirements(allReqs);
      setDestinations(allDests);
    } catch (e) {
      console.error('Error loading document config:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    const handleSync = () => loadData();
    window.addEventListener('ferex_doc_requirements_change', handleSync);
    return () => window.removeEventListener('ferex_doc_requirements_change', handleSync);
  }, []);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(''), 3500);
  };

  // Distinct country list
  const availableCountries = useMemo(() => {
    const set = new Set<string>();
    destinations.forEach(d => { if (d.name) set.add(d.name); });
    requirements.forEach(r => { if (r.country) set.add(r.country); });
    ['Poland', 'Germany', 'UK', 'USA', 'France', 'Italy', 'Hungary', 'Canada', 'Ireland'].forEach(c => set.add(c));
    return Array.from(set).sort();
  }, [destinations, requirements]);

  // Filtered requirements for selected country
  const filteredDocs = useMemo(() => {
    return requirements.filter(doc => {
      const countryMatch = selectedCountry === 'All' || doc.country.toLowerCase() === selectedCountry.toLowerCase();
      const typeMatch = typeFilter === 'All' || doc.document_type === typeFilter;
      const reqMatch = requiredFilter === 'All' || (requiredFilter === 'Required' ? doc.is_required : !doc.is_required);
      const queryMatch = !searchQuery || 
        doc.document_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (doc.description || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        doc.document_type.toLowerCase().includes(searchQuery.toLowerCase());

      return countryMatch && typeMatch && reqMatch && queryMatch;
    });
  }, [requirements, selectedCountry, typeFilter, requiredFilter, searchQuery]);

  const handleOpenAdd = () => {
    setEditingDoc(null);
    setFormCountry(selectedCountry === 'All' ? 'Poland' : selectedCountry);
    setFormDocName('');
    setFormDocType('Academic');
    setFormIsRequired(true);
    setFormDescription('');
    setFormProcessingTime('3 - 7 Days');
    setFormAuthorityFee('Free');
    setFormChecklistItems(['']);
    setShowModal(true);
  };

  const handleOpenEdit = (doc: DocumentRequirement) => {
    setEditingDoc(doc);
    setFormCountry(doc.country);
    setFormDocName(doc.document_name);
    setFormDocType(doc.document_type);
    setFormIsRequired(doc.is_required);
    setFormDescription(doc.description || '');
    setFormProcessingTime(doc.processing_time || 'Immediate');
    setFormAuthorityFee(doc.authority_fee || 'Free');
    setFormChecklistItems(doc.checklist_items && doc.checklist_items.length > 0 ? doc.checklist_items : ['']);
    setShowModal(true);
  };

  const handleSaveDoc = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formDocName.trim()) {
      showToast('Please specify the document requirement name.');
      return;
    }

    setIsSaving(true);
    const cleanedChecklist = formChecklistItems.map(s => s.trim()).filter(Boolean);

    try {
      if (editingDoc) {
        await updateDocumentRequirement(editingDoc.id, {
          country: formCountry,
          document_name: formDocName.trim(),
          document_type: formDocType,
          is_required: formIsRequired,
          description: formDescription.trim(),
          processing_time: formProcessingTime.trim(),
          authority_fee: formAuthorityFee.trim(),
          checklist_items: cleanedChecklist
        });
        showToast(`Document requirement "${formDocName}" updated successfully.`);
      } else {
        await addDocumentRequirement(formCountry, {
          document_name: formDocName.trim(),
          document_type: formDocType,
          is_required: formIsRequired,
          description: formDescription.trim(),
          processing_time: formProcessingTime.trim(),
          authority_fee: formAuthorityFee.trim(),
          checklist_items: cleanedChecklist
        });
        showToast(`New document requirement added for ${formCountry}.`);
      }
      setShowModal(false);
      loadData();
    } catch (err: any) {
      showToast(`Error saving document: ${err.message || 'Action failed'}`);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await removeDocumentRequirement(id);
      setDeleteConfirmId(null);
      showToast('Document requirement removed.');
      loadData();
    } catch (e: any) {
      showToast(`Error deleting: ${e.message}`);
    }
  };

  const handleToggleRequired = async (doc: DocumentRequirement) => {
    try {
      await updateDocumentRequirement(doc.id, { is_required: !doc.is_required });
      showToast(`Document marked as ${!doc.is_required ? 'Mandatory' : 'Optional'}.`);
      loadData();
    } catch (e) {}
  };

  const handleResetDefaults = async () => {
    if (!window.confirm('Reset all country document requirement templates to factory defaults?')) return;
    await resetDocumentRequirementsToDefaults();
    showToast('Document requirements reset to defaults.');
    loadData();
  };

  return (
    <div className="space-y-6 text-left relative min-h-[600px] pb-12">
      {/* Toast */}
      <AnimatePresence>
        {toastMessage && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed top-6 right-6 z-50 bg-slate-900 text-white px-5 py-3 rounded-xl shadow-2xl text-xs font-bold flex items-center gap-2 border border-slate-700"
          >
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            {toastMessage}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs">
        <div>
          <div className="flex items-center gap-2.5 mb-1.5">
            <div className="w-9 h-9 rounded-xl bg-[#58051E]/10 text-[#58051E] flex items-center justify-center font-bold">
              <ListChecks className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl font-black text-slate-900 tracking-tight">
                Country Document Configuration
              </h1>
              <p className="text-xs font-medium text-slate-500">
                Configure country-specific document checklists, legalization requirements, processing times & fees.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={handleResetDefaults}
            className="px-3.5 py-2 border border-slate-200 text-slate-600 hover:bg-slate-50 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer"
            title="Reset to official country templates"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Reset Defaults
          </button>
          <button
            onClick={handleOpenAdd}
            className="px-4 py-2 bg-[#58051E] text-white hover:bg-[#430316] rounded-xl text-xs font-bold flex items-center gap-2 shadow-sm transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            Add Requirement
          </button>
        </div>
      </div>

      {/* Country Filter Carousel / Selector */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">Select Destination Country</span>
          <span className="text-xs font-bold text-slate-400">{filteredDocs.length} Requirements configured</span>
        </div>
        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-thin">
          <button
            onClick={() => setSelectedCountry('All')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
              selectedCountry === 'All'
                ? 'bg-[#58051E] text-white shadow-xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            🌍 All Countries
          </button>
          {availableCountries.map(country => {
            const count = requirements.filter(r => r.country.toLowerCase() === country.toLowerCase()).length;
            const isSelected = selectedCountry.toLowerCase() === country.toLowerCase();
            return (
              <button
                key={country}
                onClick={() => setSelectedCountry(country)}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all flex items-center gap-1.5 cursor-pointer ${
                  isSelected
                    ? 'bg-[#58051E] text-white shadow-xs'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                <span>{country}</span>
                <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-extrabold ${
                  isSelected ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-600'
                }`}>
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Filters & Search Toolbar */}
      <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
        <div className="sm:col-span-6 relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search requirements, document type, processing details..."
            className="w-full pl-9.5 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#58051E]/20 focus:border-[#58051E]"
          />
        </div>

        <div className="sm:col-span-3">
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-700 font-medium focus:outline-none focus:ring-2 focus:ring-[#58051E]/20"
          >
            <option value="All">All Types</option>
            {DOC_TYPES.map(t => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
        </div>

        <div className="sm:col-span-3">
          <select
            value={requiredFilter}
            onChange={(e) => setRequiredFilter(e.target.value as any)}
            className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-700 font-medium focus:outline-none focus:ring-2 focus:ring-[#58051E]/20"
          >
            <option value="All">All Priority</option>
            <option value="Required">Required Only</option>
            <option value="Optional">Optional Only</option>
          </select>
        </div>
      </div>

      {/* Requirements List */}
      <div className="space-y-3">
        {loading ? (
          <div className="p-12 text-center bg-white rounded-2xl border border-slate-200">
            <div className="w-8 h-8 border-3 border-[#58051E] border-t-transparent rounded-full animate-spin mx-auto mb-2" />
            <p className="text-xs font-semibold text-slate-500">Loading document configuration matrix...</p>
          </div>
        ) : filteredDocs.length === 0 ? (
          <div className="p-12 text-center bg-white rounded-2xl border border-slate-200 space-y-3">
            <FileText className="w-10 h-10 text-slate-300 mx-auto" />
            <p className="text-sm font-bold text-slate-700">No document requirements found</p>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              No requirements match your active filter for {selectedCountry}. Click "Add Requirement" to set up mandatory files for this country.
            </p>
            <button
              onClick={handleOpenAdd}
              className="px-4 py-2 bg-[#58051E] text-white text-xs font-bold rounded-xl hover:bg-[#430316] transition-all"
            >
              + Add First Document Requirement
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
            {filteredDocs.map((doc) => (
              <motion.div
                key={doc.id}
                layout
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-2xs hover:shadow-md transition-all flex flex-col justify-between group"
              >
                <div>
                  <div className="flex items-start justify-between gap-3 mb-2.5">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-800 font-black text-[10px] uppercase tracking-wider border border-slate-200">
                        {doc.country}
                      </span>
                      <span className="px-2 py-0.5 rounded-md bg-rose-50 text-[#58051E] font-bold text-[10px] border border-rose-200">
                        {doc.document_type}
                      </span>
                    </div>
                    <button
                      onClick={() => handleToggleRequired(doc)}
                      className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold cursor-pointer transition-all ${
                        doc.is_required
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-300 hover:bg-emerald-100'
                          : 'bg-slate-100 text-slate-600 border border-slate-300 hover:bg-slate-200'
                      }`}
                    >
                      {doc.is_required ? 'MANDATORY' : 'OPTIONAL'}
                    </button>
                  </div>

                  <h3 className="text-sm font-extrabold text-slate-900 group-hover:text-[#58051E] transition-colors mb-1">
                    {doc.document_name}
                  </h3>
                  
                  {doc.description && (
                    <p className="text-xs text-slate-600 mb-3 leading-relaxed">
                      {doc.description}
                    </p>
                  )}

                  {doc.checklist_items && doc.checklist_items.length > 0 && (
                    <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100 mb-3 space-y-1">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Requirements / Criteria:</p>
                      {doc.checklist_items.map((item, idx) => (
                        <div key={idx} className="flex items-center gap-1.5 text-xs text-slate-700 font-medium">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                          <span>{item}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                  <div className="flex items-center gap-3">
                    <span className="flex items-center gap-1" title="Estimated processing window">
                      <Clock className="w-3.5 h-3.5 text-slate-400" />
                      {doc.processing_time || '1-3 Days'}
                    </span>
                    <span className="flex items-center gap-1 font-semibold text-slate-700" title="Consular / Legalization Authority Fee">
                      <DollarSign className="w-3.5 h-3.5 text-slate-400" />
                      {doc.authority_fee || 'Free'}
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => handleOpenEdit(doc)}
                      className="p-1.5 text-slate-400 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                      title="Edit requirement"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => setDeleteConfirmId(doc.id)}
                      className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                      title="Delete requirement"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>

      {/* Add / Edit Modal */}
      <AnimatePresence>
        {showModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-2xl max-w-xl w-full p-6 shadow-2xl border border-slate-100 max-h-[90vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-[#58051E]/10 text-[#58051E] flex items-center justify-center">
                    <FileText className="w-4 h-4" />
                  </div>
                  <h2 className="text-base font-black text-slate-900">
                    {editingDoc ? 'Edit Document Requirement' : 'Add Document Requirement'}
                  </h2>
                </div>
                <button
                  onClick={() => setShowModal(false)}
                  className="p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleSaveDoc} className="space-y-4 text-left">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Target Country *</label>
                    <select
                      value={formCountry}
                      onChange={(e) => setFormCountry(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:bg-white focus:ring-2 focus:ring-[#58051E]/20"
                    >
                      {availableCountries.map(c => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Document Category *</label>
                    <select
                      value={formDocType}
                      onChange={(e) => setFormDocType(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:bg-white focus:ring-2 focus:ring-[#58051E]/20"
                    >
                      {DOC_TYPES.map(t => (
                        <option key={t} value={t}>{t}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Document Name *</label>
                  <input
                    type="text"
                    required
                    value={formDocName}
                    onChange={(e) => setFormDocName(e.target.value)}
                    placeholder="e.g. APS Certificate / Apostille Attestation / Bank Statement"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:bg-white focus:ring-2 focus:ring-[#58051E]/20"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Description & Instructions</label>
                  <textarea
                    rows={2}
                    value={formDescription}
                    onChange={(e) => setFormDescription(e.target.value)}
                    placeholder="Clear guidance for students regarding scans, stamps, and validity..."
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:bg-white focus:ring-2 focus:ring-[#58051E]/20"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Processing Time</label>
                    <input
                      type="text"
                      value={formProcessingTime}
                      onChange={(e) => setFormProcessingTime(e.target.value)}
                      placeholder="e.g. 7 - 14 Days"
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:bg-white focus:ring-2 focus:ring-[#58051E]/20"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Authority / Consular Fee</label>
                    <input
                      type="text"
                      value={formAuthorityFee}
                      onChange={(e) => setFormAuthorityFee(e.target.value)}
                      placeholder="e.g. €250 / Free / ₹18,000"
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:bg-white focus:ring-2 focus:ring-[#58051E]/20"
                    />
                  </div>
                </div>

                <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <input
                    type="checkbox"
                    id="reqCheckbox"
                    checked={formIsRequired}
                    onChange={(e) => setFormIsRequired(e.target.checked)}
                    className="w-4 h-4 rounded text-[#58051E] focus:ring-[#58051E]"
                  />
                  <label htmlFor="reqCheckbox" className="text-xs font-bold text-slate-800 cursor-pointer">
                    Mandatory Requirement (Student cannot proceed to university file submission without this document)
                  </label>
                </div>

                {/* Checklist Bullet Points */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-slate-700">Verification Checklist Criteria</label>
                    <button
                      type="button"
                      onClick={() => setFormChecklistItems(prev => [...prev, ''])}
                      className="text-[11px] font-bold text-[#58051E] hover:underline cursor-pointer"
                    >
                      + Add Check Item
                    </button>
                  </div>
                  {formChecklistItems.map((item, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <input
                        type="text"
                        value={item}
                        onChange={(e) => {
                          const val = e.target.value;
                          setFormChecklistItems(prev => {
                            const copy = [...prev];
                            copy[idx] = val;
                            return copy;
                          });
                        }}
                        placeholder={`Checklist item #${idx + 1}`}
                        className="flex-1 px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-800"
                      />
                      {formChecklistItems.length > 1 && (
                        <button
                          type="button"
                          onClick={() => setFormChecklistItems(prev => prev.filter((_, i) => i !== idx))}
                          className="p-1.5 text-slate-400 hover:text-rose-600 rounded-md"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>

                <div className="flex justify-end gap-2.5 pt-4 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setShowModal(false)}
                    className="px-4 py-2 border border-slate-200 text-slate-700 rounded-xl text-xs font-bold hover:bg-slate-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSaving}
                    className="px-5 py-2 bg-[#58051E] text-white rounded-xl text-xs font-bold hover:bg-[#430316] transition-all disabled:opacity-50"
                  >
                    {isSaving ? 'Saving...' : editingDoc ? 'Update Requirement' : 'Create Requirement'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {deleteConfirmId && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-2xl border border-slate-100 text-center space-y-4"
            >
              <div className="w-12 h-12 rounded-full bg-rose-100 text-rose-600 mx-auto flex items-center justify-center">
                <Trash2 className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-black text-slate-900">Delete Requirement?</h3>
                <p className="text-xs text-slate-500 mt-1">
                  Are you sure you want to remove this document requirement? Students from this country will no longer be asked to upload it.
                </p>
              </div>
              <div className="flex gap-2 justify-center">
                <button
                  onClick={() => setDeleteConfirmId(null)}
                  className="px-4 py-2 bg-slate-100 text-slate-700 text-xs font-bold rounded-xl hover:bg-slate-200"
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleDelete(deleteConfirmId)}
                  className="px-4 py-2 bg-rose-600 text-white text-xs font-bold rounded-xl hover:bg-rose-700"
                >
                  Confirm Delete
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
