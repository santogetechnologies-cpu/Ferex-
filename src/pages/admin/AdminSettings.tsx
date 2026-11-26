import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Save, CheckCircle2, Building2, Shield, Lock, MessageSquare,
  Check, Sliders, Phone, Key, Globe, Send, AlertCircle
} from 'lucide-react';
import { ChangePasswordForm } from '../../components/ChangePasswordForm';
import { ToastNotification } from '../../components/ToastNotification';
import { Button } from '../../components/Button';
import { supabase } from '../../lib/supabase';
import { useRealtimeTable } from '../../hooks/useRealtimeTable';
import { useDestinations } from '../../hooks/useDestinations';
import { CountryFlag } from '../../components/CountryFlag';
import { ArrowUp, ArrowDown, X as XIcon, Plus } from 'lucide-react';
import {
  getLeadFormConfig,
  saveLeadFormConfig,
  getWhatsAppConfig,
  saveWhatsAppConfig,
  testWhatsAppConnection,
  type LeadFormConfig,
  type WhatsAppConfig,
  DEFAULT_LEAD_FORM_CONFIG,
  DEFAULT_WHATSAPP_CONFIG
} from '../../lib/api/educationLeads';

const TABS = ['Organization', 'Lead Form Configuration', 'WhatsApp API & Automation', 'Security & Password'];

const TAB_ICONS: Record<string, any> = {
  Organization: <Building2 className="w-4 h-4 text-blue-600" />,
  'Lead Form Configuration': <Sliders className="w-4 h-4 text-emerald-600" />,
  'WhatsApp API & Automation': <MessageSquare className="w-4 h-4 text-cyan-600" />,
  'Security & Password': <Shield className="w-4 h-4 text-[#5A0122]" />,
};

const INITIAL_ORG = {
  name: 'FEREX Ventures',
  tagline: 'Global Ventures & Educational Consulting',
  email: 'info@ferexventures.com',
  phone: '+91 484 290 1234',
  website: 'www.ferexventures.com',
  address: 'FEREX Ventures Tower, Infopark Expressway, Kochi, Kerala 682042',
  timezone: 'IST (UTC+5:30)',
  language: 'English'
};

export const AdminSettings: React.FC = () => {
  const { destinations: allDestinations } = useDestinations();
  const [activeTab, setActiveTab] = useState('Organization');
  const [org, setOrg] = useState(INITIAL_ORG);
  const [toast, setToast] = useState('');

  // Lead Form Settings State
  const [formConfig, setFormConfig] = useState<LeadFormConfig>(DEFAULT_LEAD_FORM_CONFIG);
  const [isSavingForm, setIsSavingForm] = useState(false);

  // WhatsApp API Settings State
  const [whatsappConfig, setWhatsappConfig] = useState<WhatsAppConfig>(DEFAULT_WHATSAPP_CONFIG);
  const [isSavingWhatsApp, setIsSavingWhatsApp] = useState(false);
  const [testPhoneNumber, setTestPhoneNumber] = useState('+91');
  const [isTestingWhatsApp, setIsTestingWhatsApp] = useState(false);

  // Last values read from the database. A live change from another admin replaces the form only when this admin has no unsaved edits.
  const saved = useRef<{ form: string; wa: string; org: string }>({ form: JSON.stringify(DEFAULT_LEAD_FORM_CONFIG), wa: JSON.stringify(DEFAULT_WHATSAPP_CONFIG), org: JSON.stringify(INITIAL_ORG) });
  const current = useRef({ form: '', wa: '', org: '' });
  current.current = { form: JSON.stringify(formConfig), wa: JSON.stringify(whatsappConfig), org: JSON.stringify(org) };
  const [waLoadError, setWaLoadError] = useState('');
  const [liveAt, setLiveAt] = useState<Date | null>(null);
  const [deliveries, setDeliveries] = useState<{ id: string; title: string; description: string; created_at: string }[]>([]);

  const loadAll = useCallback(async (fromLive = false) => {
    let applied = false;
    try {
      const f = await getLeadFormConfig();
      const fs = JSON.stringify(f);
      if (current.current.form === saved.current.form && fs !== current.current.form) { setFormConfig(f); applied = true; }
      saved.current.form = fs;
    } catch {}
    try {
      const w = await getWhatsAppConfig();
      const ws = JSON.stringify(w);
      setWaLoadError('');
      if (current.current.wa === saved.current.wa && ws !== current.current.wa) { setWhatsappConfig(w); applied = true; }
      saved.current.wa = ws;
    } catch (e: any) { setWaLoadError(e.message || 'Could not load the WhatsApp settings'); }
    try {
      const { data } = await supabase.from('system_config').select('value').eq('key', 'ferex_organization_settings').maybeSingle();
      if (data?.value && typeof data.value === 'object') {
        const merged = { ...INITIAL_ORG, ...(data.value as object) };
        const os = JSON.stringify(merged);
        if (current.current.org === saved.current.org && os !== current.current.org) { setOrg(merged); applied = true; }
        saved.current.org = os;
      }
    } catch {}
    setLiveAt(new Date());
    if (fromLive && applied) showToast('Settings were updated by another admin. Showing the latest.');
  }, []);

  const loadDeliveries = useCallback(async () => {
    const { data } = await supabase.from('education_lead_activities').select('id,title,description,created_at').eq('activity_type', 'WhatsApp Message').order('created_at', { ascending: false }).limit(8);
    setDeliveries((data || []) as any);
  }, []);

  useEffect(() => { void loadAll(); void loadDeliveries(); }, [loadAll, loadDeliveries]);
  useRealtimeTable('system_config', () => { void loadAll(true); });
  useRealtimeTable('education_lead_activities', () => { void loadDeliveries(); });

  const [isSavingOrg, setIsSavingOrg] = useState(false);
  const handleSaveOrg = async () => {
    setIsSavingOrg(true);
    try {
      const { error } = await supabase.from('system_config').upsert({ key: 'ferex_organization_settings', value: org, updated_at: new Date().toISOString() }, { onConflict: 'key' });
      if (error) throw new Error(error.message);
      saved.current.org = JSON.stringify(org);
      showToast('Organization settings saved.');
    } catch (err: any) {
      showToast(`Not saved: ${err.message || 'the database refused the change'}`);
    } finally {
      setIsSavingOrg(false);
    }
  };

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(''), 3500);
  };

  const handleSaveLeadForm = async () => {
    setIsSavingForm(true);
    try {
      await saveLeadFormConfig(formConfig);
      saved.current.form = JSON.stringify(formConfig);
      showToast('Lead form saved. The enquiry page updates instantly.');
    } catch (err: any) {
      showToast(`Not saved: ${err.message}`);
    } finally {
      setIsSavingForm(false);
    }
  };

  const handleSaveWhatsApp = async () => {
    setIsSavingWhatsApp(true);
    try {
      // With Meta nothing secret is stored in the database: the server reads its own secrets.
      const toSave = whatsappConfig.provider === 'meta' ? { ...whatsappConfig, apiKey: '', phoneNumberId: '', instanceId: '' } : whatsappConfig;
      await saveWhatsAppConfig(toSave);
      setWhatsappConfig(toSave);
      saved.current.wa = JSON.stringify(toSave);
      showToast('WhatsApp settings saved. New enquiries use them immediately.');
    } catch (err: any) {
      showToast(`Not saved: ${err.message}`);
    } finally {
      setIsSavingWhatsApp(false);
    }
  };

  const missing = (() => {
    const c = whatsappConfig;
    const id = c.phoneNumberId || c.instanceId;
    // Meta: the access token and phone number ID live in the server's secure secrets, not in this screen.
    if (c.provider === 'meta') return [] as string[];
    if (c.provider === 'ultramsg') return [!c.apiKey && 'token', !id && 'instance ID'].filter(Boolean) as string[];
    if (c.provider === 'twilio') return [!id && 'account SID', !c.apiKey && 'auth token', !c.senderNumber && 'sender number'].filter(Boolean) as string[];
    return [!c.webhookUrl && 'webhook URL'].filter(Boolean) as string[];
  })();
  const waDirty = current.current.wa !== saved.current.wa;

  const handleTestWhatsApp = async () => {
    if (!testPhoneNumber || testPhoneNumber.length < 8) {
      showToast('Please enter a valid phone number with country code for testing.');
      return;
    }
    setIsTestingWhatsApp(true);
    try {
      const res = await testWhatsAppConnection(testPhoneNumber, whatsappConfig);
      showToast(res.message);
      void loadDeliveries();
    } catch (err: any) {
      showToast(`Test failed: ${err.message}`);
    } finally {
      setIsTestingWhatsApp(false);
    }
  };

  const renderOrg = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {[
          { label: 'Organization Name', key: 'name' as const },
          { label: 'Tagline', key: 'tagline' as const },
          { label: 'Admin Email', key: 'email' as const },
          { label: 'Phone', key: 'phone' as const },
          { label: 'Website', key: 'website' as const },
          { label: 'Address', key: 'address' as const },
        ].map(({ label, key }) => (
          <div key={key}>
            <label className="block text-[10px] font-extrabold text-slate-500 uppercase tracking-wider mb-1.5">{label}</label>
            <input
              value={org[key]}
              onChange={(e) => setOrg({ ...org, [key]: e.target.value })}
              className="w-full h-10 px-3.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:outline-none focus:border-[#5A0122]/50 focus:bg-white transition-all"
            />
          </div>
        ))}
        <div>
          <label className="block text-[10px] font-extrabold text-slate-500 uppercase tracking-wider mb-1.5">Timezone</label>
          <select
            value={org.timezone}
            onChange={(e) => setOrg({ ...org, timezone: e.target.value })}
            className="w-full h-10 px-3.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:outline-none focus:border-[#5A0122]/50 focus:bg-white cursor-pointer"
          >
            <option>IST (UTC+5:30)</option>
            <option>UTC</option>
            <option>GST (UTC+4)</option>
            <option>CET (UTC+1)</option>
          </select>
        </div>
        <div>
          <label className="block text-[10px] font-extrabold text-slate-500 uppercase tracking-wider mb-1.5">Language</label>
          <select
            value={org.language}
            onChange={(e) => setOrg({ ...org, language: e.target.value })}
            className="w-full h-10 px-3.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:outline-none focus:border-[#5A0122]/50 focus:bg-white cursor-pointer"
          >
            <option>English</option>
            <option>Arabic</option>
            <option>Hindi</option>
          </select>
        </div>
      </div>
      <div className="pt-3 border-t border-slate-100 flex justify-end">
        <button
          onClick={handleSaveOrg}
          disabled={isSavingOrg}
          className="flex items-center gap-2 h-10 px-5 bg-[#5A0122] hover:bg-[#68092A] text-white text-xs font-bold rounded-xl transition-all shadow-xs cursor-pointer disabled:opacity-60"
        >
          <Save className="w-4 h-4" /> {isSavingOrg ? 'Saving...' : 'Save Organization Settings'}
        </button>
      </div>
    </div>
  );

  return (
    <div className="space-y-5 text-left w-full max-w-full overflow-x-hidden">
      {/* Floating Toast Notification */}
      <ToastNotification message={toast} onClose={() => setToast('')} />

      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200/80 pb-3">
        <div>
          <h1 className="text-xl font-black text-slate-900 tracking-tight">Settings</h1>
          <p className="text-xs font-medium text-slate-500 mt-0.5">Organisation profile, lead form, WhatsApp and account settings.</p>
        </div>
      </div>

      {/* Main Layout: Navigation & Content */}
      <div className="flex flex-col lg:flex-row gap-5 items-start w-full">
        {/* Tab Navigation Sidebar */}
        <div className="w-full lg:w-64 shrink-0 flex lg:flex-col flex-wrap gap-1.5 p-1.5 bg-slate-100/80 rounded-2xl border border-slate-200/80">
          {TABS.map((tab) => {
            const isActive = activeTab === tab;
            return (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`flex-1 lg:flex-initial flex items-center gap-2.5 h-10 px-3.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap lg:whitespace-normal text-left
                  ${isActive
                    ? 'bg-[#5A0122] text-white shadow-xs font-black'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-white/70'}`}
              >
                <div className={`shrink-0 ${isActive ? 'brightness-200' : ''}`}>
                  {TAB_ICONS[tab]}
                </div>
                <span className="truncate">{tab}</span>
              </button>
            );
          })}
        </div>

        {/* Tab Content Panel */}
        <div className="flex-1 min-w-0 w-full bg-white border border-slate-200/80 rounded-2xl p-5 md:p-6 shadow-xs">
          
          {/* TAB 1: Organization */}
          {activeTab === 'Organization' && (
            <>
              <h2 className="text-sm font-black text-slate-900 mb-5 border-b border-slate-100 pb-3">
                Organization Profile & Headquarters
              </h2>
              <div className="w-full min-w-0 overflow-x-visible">
                {renderOrg()}
              </div>
            </>
          )}

          {/* TAB 2: Lead Form Configuration */}
          {activeTab === 'Lead Form Configuration' && (
            <div className="space-y-6">
              <div>
                <h2 className="text-sm font-black text-slate-900 border-b border-slate-100 pb-3 flex items-center justify-between">
                  <span>Lead Generation Landing Page Form Controls</span>
                  <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200 inline-flex items-center gap-1.5">
                    <i className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />Live{liveAt ? ` · ${liveAt.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}` : ''}
                  </span>
                </h2>
                <p className="text-xs text-slate-500 mt-1">
                  Enable or disable individual fields for prospective student leads on the admissions landing page (`/study-abroad`). Note that Phone Number is strictly compulsory.
                </p>
              </div>

              {/* Field Toggles Card */}
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200/80 space-y-3">
                <span className="text-[10px] font-black uppercase text-slate-400 block tracking-wider">
                  Lead Capture Form Fields
                </span>

                <div className="space-y-3">
                  {/* Phone Number (ALWAYS COMPULSORY) */}
                  <div className="flex items-center justify-between p-3 bg-white rounded-xl border border-slate-200 shadow-2xs">
                    <div className="flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-lg bg-amber-50 text-amber-700 flex items-center justify-center font-bold">
                        <Phone className="w-3.5 h-3.5" />
                      </div>
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs font-black text-slate-900">Mobile / WhatsApp Number</span>
                          <span className="text-[9px] font-black text-amber-700 bg-amber-100 px-1.5 py-0.2 rounded border border-amber-300">
                            COMPULSORY (LOCKED)
                          </span>
                        </div>
                        <span className="text-[11px] text-slate-400">
                          Primary identifier used for CRM lead matching, WhatsApp welcome triggers, and counselor follow-up.
                        </span>
                      </div>
                    </div>
                    <div className="text-xs font-black text-amber-800 bg-amber-50 px-2 py-1 rounded-lg">
                      Always Enabled
                    </div>
                  </div>

                  {/* Full Name Toggle */}
                  <div className="flex items-center justify-between p-3 bg-white rounded-xl border border-slate-200 shadow-2xs">
                    <div>
                      <span className="text-xs font-black text-slate-900 block">Student Full Name</span>
                      <span className="text-[11px] text-slate-400">
                        Displays input for prospective student's first and last name.
                      </span>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formConfig.name_enabled}
                        onChange={(e) => setFormConfig({ ...formConfig, name_enabled: e.target.checked })}
                        className="sr-only peer"
                      />
                      <div className="w-10 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#5A0122]" />
                    </label>
                  </div>

                  {/* Email Toggle */}
                  <div className="flex items-center justify-between p-3 bg-white rounded-xl border border-slate-200 shadow-2xs">
                    <div>
                      <span className="text-xs font-black text-slate-900 block">Email Address (Optional for Lead)</span>
                      <span className="text-[11px] text-slate-400">
                        Shows email input field on lead capture form.
                      </span>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formConfig.email_enabled}
                        onChange={(e) => setFormConfig({ ...formConfig, email_enabled: e.target.checked })}
                        className="sr-only peer"
                      />
                      <div className="w-10 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#5A0122]" />
                    </label>
                  </div>

                  {/* Preferred Country Toggle */}
                  <div className="flex items-center justify-between p-3 bg-white rounded-xl border border-slate-200 shadow-2xs">
                    <div>
                      <span className="text-xs font-black text-slate-900 block">Preferred Study Destination (Country)</span>
                      <span className="text-[11px] text-slate-400">
                        Allows students to select Poland, Germany, Italy, Moldova, France, Spain, Czech Republic, etc.
                      </span>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formConfig.country_enabled}
                        onChange={(e) => setFormConfig({ ...formConfig, country_enabled: e.target.checked })}
                        className="sr-only peer"
                      />
                      <div className="w-10 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#5A0122]" />
                    </label>
                  </div>

                  {/* Degree Level Toggle */}
                  <div className="flex items-center justify-between p-3 bg-white rounded-xl border border-slate-200 shadow-2xs">
                    <div>
                      <span className="text-xs font-black text-slate-900 block">Preferred Course / Program</span>
                      <span className="text-[11px] text-slate-400">
                        Allows selecting Bachelor's, Master's, Integrated, or Doctorate level.
                      </span>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formConfig.degree_level_enabled}
                        onChange={(e) => setFormConfig({ ...formConfig, degree_level_enabled: e.target.checked })}
                        className="sr-only peer"
                      />
                      <div className="w-10 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#5A0122]" />
                    </label>
                  </div>
                </div>
              </div>

              {/* Intake + highlighted countries */}
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200/80 space-y-4">
                <div className="flex items-center justify-between p-3 bg-white rounded-xl border border-slate-200">
                  <div><span className="text-xs font-black text-slate-900 block">Preferred Intake</span><span className="text-[11px] text-slate-400">Asks when the student wants to start.</span></div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input type="checkbox" checked={formConfig.intake_enabled} onChange={(e) => setFormConfig({ ...formConfig, intake_enabled: e.target.checked })} className="sr-only peer" />
                    <div className="w-10 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#5A0122]" />
                  </label>
                </div>

                <div>
                  <span className="text-[10px] font-black uppercase text-slate-400 block tracking-wider">Highlighted countries</span>
                  <p className="text-[11px] text-slate-500 mt-1">Pick the countries to show as round flags on the enquiry page, and put them in order. The first one is shown first. Leave empty to use your featured countries.</p>
                  <ol className="mt-3 space-y-2">
                    {(formConfig.highlighted_countries || []).map((c, i, list) => (
                      <li key={c} className="flex items-center gap-2 bg-white border border-slate-200 rounded-xl px-3 py-2">
                        <span className="w-6 h-6 rounded-full bg-[#5A0122] text-white text-[11px] font-bold flex items-center justify-center shrink-0">{i + 1}</span>
                        <span className="w-7 h-7 rounded-full overflow-hidden ring-2 ring-[#5A0122]/20 shrink-0"><CountryFlag name={c} code={allDestinations.find(d => d.name.trim() === c)?.code} className="w-full h-full" /></span><span className="text-xs font-bold text-slate-900 flex-1 truncate">{c}</span>
                        <button type="button" aria-label={`Move ${c} up`} disabled={i === 0} onClick={() => { const n = [...list]; [n[i - 1], n[i]] = [n[i], n[i - 1]]; setFormConfig({ ...formConfig, highlighted_countries: n }); }} className="p-1.5 rounded-lg hover:bg-slate-100 disabled:opacity-30 cursor-pointer"><ArrowUp className="w-3.5 h-3.5" /></button>
                        <button type="button" aria-label={`Move ${c} down`} disabled={i === list.length - 1} onClick={() => { const n = [...list]; [n[i + 1], n[i]] = [n[i], n[i + 1]]; setFormConfig({ ...formConfig, highlighted_countries: n }); }} className="p-1.5 rounded-lg hover:bg-slate-100 disabled:opacity-30 cursor-pointer"><ArrowDown className="w-3.5 h-3.5" /></button>
                        <button type="button" aria-label={`Remove ${c}`} onClick={() => setFormConfig({ ...formConfig, highlighted_countries: list.filter(x => x !== c) })} className="p-1.5 rounded-lg hover:bg-rose-50 text-rose-600 cursor-pointer"><XIcon className="w-3.5 h-3.5" /></button>
                      </li>
                    ))}
                  </ol>
                  <div className="mt-3 flex items-center gap-2">
                    <Plus className="w-4 h-4 text-slate-400" />
                    <select aria-label="Add a highlighted country" value="" onChange={(e) => { if (e.target.value) setFormConfig({ ...formConfig, highlighted_countries: [...(formConfig.highlighted_countries || []), e.target.value] }); }} className="h-9 px-3 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-700 cursor-pointer">
                      <option value="">Add a country…</option>
                      {allDestinations.filter(d => d.is_active !== false && !(formConfig.highlighted_countries || []).includes(d.name.trim())).map(d => <option key={d.id} value={d.name.trim()}>{d.name}</option>)}
                    </select>
                    <span className="text-[11px] text-slate-500">{(formConfig.highlighted_countries || []).length} highlighted</span>
                  </div>
                </div>
              </div>

              {/* Form Content Labels Customization */}
              <div className="space-y-3">
                <span className="text-[10px] font-black uppercase text-slate-400 block tracking-wider">
                  Landing Page Headings & Call to Action
                </span>

                <div className="space-y-3">
                  <div>
                    <label className="block text-[10px] font-extrabold text-slate-500 uppercase mb-1">
                      Page Headline
                    </label>
                    <input
                      type="text"
                      value={formConfig.headline}
                      onChange={(e) => setFormConfig({ ...formConfig, headline: e.target.value })}
                      className="w-full h-10 px-3.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-extrabold text-slate-500 uppercase mb-1">
                      Submit Button Label
                    </label>
                    <input
                      type="text"
                      value={formConfig.submit_button_text}
                      onChange={(e) => setFormConfig({ ...formConfig, submit_button_text: e.target.value })}
                      className="w-full h-10 px-3.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900"
                    />
                  </div>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 flex justify-end">
                <Button
                  onClick={handleSaveLeadForm}
                  disabled={isSavingForm}
                  className="bg-[#5A0122] hover:bg-[#68092A] text-white text-xs font-bold"
                >
                  <Save className="w-4 h-4 mr-1.5" />
                  {isSavingForm ? 'Saving Controls...' : 'Save Lead Form Controls'}
                </Button>
              </div>
            </div>
          )}

          {/* TAB 3: WhatsApp API & Automation */}
          {activeTab === 'WhatsApp API & Automation' && (
            <div className="space-y-6">
              <div>
                <h2 className="text-sm font-black text-slate-900 border-b border-slate-100 pb-3 flex items-center justify-between">
                  <span>WhatsApp Gateway API & Auto-Trigger Settings</span>
                  <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border ${!whatsappConfig.enabled ? 'text-slate-600 bg-slate-100 border-slate-200' : missing.length ? 'text-amber-800 bg-amber-50 border-amber-200' : 'text-emerald-700 bg-emerald-50 border-emerald-200'}`}>
                    {!whatsappConfig.enabled ? 'Automatic greeting off' : missing.length ? `Needs ${missing.join(' and ')}` : 'Ready to send'}
                  </span>
                </h2>
                <p className="text-xs text-slate-500 mt-1">
                  Configure WhatsApp Cloud API (Meta), UltraMsg, or Webhooks. When a student lead submits an enquiry, a personalized greeting with European universities chat guidance triggers automatically.
                </p>
              </div>

              {/* Master WhatsApp Toggle */}
              <div className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-200">
                <div>
                  <span className="text-xs font-black text-slate-900 block">Automated WhatsApp Lead Greetings</span>
                  <span className="text-[11px] text-slate-500">
                    Immediately send verified university information to the student's mobile number upon enquiry submission.
                  </span>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={whatsappConfig.enabled}
                    onChange={(e) => setWhatsappConfig({ ...whatsappConfig, enabled: e.target.checked })}
                    className="sr-only peer"
                  />
                  <div className="w-10 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600" />
                </label>
              </div>

              {/* Gateway Provider Selection */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-extrabold text-slate-500 uppercase tracking-wider mb-1.5">
                    WhatsApp Gateway Provider
                  </label>
                  <select
                    value={whatsappConfig.provider}
                    onChange={(e) => setWhatsappConfig({ ...whatsappConfig, provider: e.target.value as any })}
                    className="w-full h-10 px-3.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:border-[#5A0122]"
                  >
                    <option value="meta">Meta WhatsApp Cloud API (Official Graph API)</option>
                    <option value="ultramsg">UltraMsg API (Instance Based)</option>
                    <option value="twilio">Twilio WhatsApp Business</option>
                    <option value="webhook">Custom Webhook Dispatcher</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-extrabold text-slate-500 uppercase tracking-wider mb-1.5">
                    Sender Phone / WhatsApp Number
                  </label>
                  <input
                    type="text"
                    value={whatsappConfig.senderNumber}
                    onChange={(e) => setWhatsappConfig({ ...whatsappConfig, senderNumber: e.target.value })}
                    placeholder="+91 98200 11223"
                    className="w-full h-10 px-3.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900"
                  />
                </div>
              </div>

              {/* API Credentials */}
              {whatsappConfig.provider === 'meta' ? (
                <p className="rounded-xl border border-emerald-200 bg-emerald-50 px-3.5 py-2.5 text-xs font-semibold text-emerald-800">The access token and phone number ID are stored securely on the server, so there is nothing to enter here. Use the test below to confirm the connection.</p>
              ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-extrabold text-slate-500 uppercase tracking-wider mb-1.5">
                    API Token / Permanent Access Key
                  </label>
                  <input
                    type="password"
                    value={whatsappConfig.apiKey}
                    onChange={(e) => setWhatsappConfig({ ...whatsappConfig, apiKey: e.target.value })}
                    placeholder="EAABw..."
                    className="w-full h-10 px-3.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono text-slate-900"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-extrabold text-slate-500 uppercase tracking-wider mb-1.5">
                    Phone Number ID / Instance ID
                  </label>
                  <input
                    type="text"
                    value={whatsappConfig.phoneNumberId || whatsappConfig.instanceId || ''}
                    onChange={(e) => setWhatsappConfig({
                      ...whatsappConfig,
                      phoneNumberId: e.target.value,
                      instanceId: e.target.value
                    })}
                    placeholder="1049283749281"
                    className="w-full h-10 px-3.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono text-slate-900"
                  />
                </div>
              </div>
              )}

              {/* Webhook URL (if selected) */}
              {whatsappConfig.provider === 'webhook' && (
                <div>
                  <label className="block text-[10px] font-extrabold text-slate-500 uppercase tracking-wider mb-1.5">
                    Webhook Endpoint URL
                  </label>
                  <input
                    type="url"
                    value={whatsappConfig.webhookUrl || ''}
                    onChange={(e) => setWhatsappConfig({ ...whatsappConfig, webhookUrl: e.target.value })}
                    placeholder="https://api.my-crm.com/whatsapp-hook"
                    className="w-full h-10 px-3.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono text-slate-900"
                  />
                </div>
              )}

              {whatsappConfig.provider === 'meta' && (
                <div className="p-4 rounded-2xl border border-slate-200 bg-slate-50 space-y-3">
                  <div>
                    <p className="text-xs font-black text-slate-900">Approved WhatsApp template for new enquiries</p>
                    <p className="text-[11px] text-slate-500 mt-0.5">WhatsApp only delivers plain text to someone who messaged you in the last 24 hours. A new enquirer has not, so the greeting must go out as a template approved in WhatsApp Manager. Leave the name empty to send plain text (it will only reach people who wrote to you first).</p>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="sm:col-span-2">
                      <label className="block text-[10px] font-extrabold text-slate-500 uppercase tracking-wider mb-1.5">Template name</label>
                      <input type="text" aria-label="WhatsApp template name" value={whatsappConfig.welcome_template_name || ''} onChange={(e) => setWhatsappConfig({ ...whatsappConfig, welcome_template_name: e.target.value.trim() })} placeholder="enquiry_welcome" className="w-full h-10 px-3.5 bg-white border border-slate-200 rounded-xl text-xs font-mono text-slate-900" />
                    </div>
                    <div>
                      <label className="block text-[10px] font-extrabold text-slate-500 uppercase tracking-wider mb-1.5">Language code</label>
                      <input type="text" aria-label="WhatsApp template language" value={whatsappConfig.welcome_template_language || ''} onChange={(e) => setWhatsappConfig({ ...whatsappConfig, welcome_template_language: e.target.value.trim() })} placeholder="en" className="w-full h-10 px-3.5 bg-white border border-slate-200 rounded-xl text-xs font-mono text-slate-900" />
                    </div>
                  </div>
                  <p className="text-[11px] text-slate-500">The template body must use <span className="font-mono">{'{{1}}'}</span> for the student's name and <span className="font-mono">{'{{2}}'}</span> for the country.</p>
                </div>
              )}

              {/* Welcome Message Template: with Meta and an approved template, the template text is what gets sent, so this box is not shown. */}
              {whatsappConfig.provider === 'meta' && whatsappConfig.welcome_template_name ? (
                <p className="rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-xs font-semibold text-slate-600">New enquiries receive the approved template <span className="font-mono text-slate-900">{whatsappConfig.welcome_template_name}</span>. Its wording is managed in WhatsApp Manager, so there is no message text to edit here.</p>
              ) : (
              <>
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-[10px] font-extrabold text-slate-500 uppercase tracking-wider">
                    Automated Welcome Message Template
                  </label>
                  <div className="text-[10px] text-slate-400 space-x-1">
                    <span>Variables:</span>
                    <span className="font-mono text-[#5A0122] bg-[#5A0122]/10 px-1 rounded">{`{student_name}`}</span>
                    <span className="font-mono text-[#5A0122] bg-[#5A0122]/10 px-1 rounded">{`{country}`}</span>
                    <span className="font-mono text-[#5A0122] bg-[#5A0122]/10 px-1 rounded">{`{degree}`}</span>
                    <span className="font-mono text-[#5A0122] bg-[#5A0122]/10 px-1 rounded">{`{counselor_name}`}</span>
                  </div>
                </div>
                <textarea
                  rows={6}
                  value={whatsappConfig.welcome_message_template}
                  onChange={(e) => setWhatsappConfig({ ...whatsappConfig, welcome_message_template: e.target.value })}
                  className="w-full p-3.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:outline-none focus:border-[#5A0122] leading-relaxed"
                />
              </div>

              </>
              )}

              {waLoadError && <p role="alert" className="text-xs font-semibold text-rose-700 bg-rose-50 border border-rose-200 rounded-xl p-3">{waLoadError}. Only education admins can see and change the gateway keys.</p>}
              {waDirty && <p className="text-xs font-semibold text-amber-800 bg-amber-50 border border-amber-200 rounded-xl p-3">You have unsaved changes. The test below uses these values; new enquiries use them only after you save.</p>}

              {/* Live delivery log */}
              <div className="p-4 bg-white rounded-2xl border border-slate-200/80 space-y-2">
                <span className="text-[10px] font-black uppercase text-slate-500 block tracking-wider flex items-center gap-1.5"><i className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />Recent messages (live)</span>
                {deliveries.length === 0 ? <p className="text-xs text-slate-500">No WhatsApp messages yet. New enquiries and resends appear here the moment they are sent.</p> : (
                  <ul className="divide-y divide-slate-100">
                    {deliveries.map(d => { const failed = /failed/i.test(d.title); return (
                      <li key={d.id} className="py-2 flex items-start gap-2.5">
                        <span className={`mt-1 w-2 h-2 rounded-full shrink-0 ${failed ? 'bg-rose-500' : 'bg-emerald-500'}`} />
                        <div className="min-w-0 flex-1"><p className="text-xs font-bold text-slate-900">{d.title}</p><p className="text-[11px] text-slate-500 break-words">{d.description}</p></div>
                        <span className="text-[10px] text-slate-400 shrink-0">{new Date(d.created_at).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}</span>
                      </li>); })}
                  </ul>
                )}
              </div>

              {/* Real-time Test WhatsApp Box */}
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200/80 space-y-3">
                <span className="text-[10px] font-black uppercase text-slate-500 block tracking-wider">
                  Test WhatsApp API Connection
                </span>
                <div className="flex gap-2">
                  <input
                    type="tel"
                    value={testPhoneNumber}
                    onChange={(e) => setTestPhoneNumber(e.target.value)}
                    placeholder="+91 98200 12345"
                    className="flex-1 h-9 px-3 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-900"
                  />
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    disabled={isTestingWhatsApp}
                    onClick={handleTestWhatsApp}
                    className="text-xs font-bold border-emerald-300 text-emerald-700 hover:bg-emerald-50 flex items-center gap-1.5"
                  >
                    <Send className="w-3.5 h-3.5" />
                    {isTestingWhatsApp ? 'Sending...' : 'Send Test WhatsApp'}
                  </Button>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 flex justify-end">
                <Button
                  onClick={handleSaveWhatsApp}
                  disabled={isSavingWhatsApp}
                  className="bg-[#5A0122] hover:bg-[#68092A] text-white text-xs font-bold"
                >
                  <Save className="w-4 h-4 mr-1.5" />
                  {isSavingWhatsApp ? 'Saving Gateway...' : 'Save WhatsApp Configuration'}
                </Button>
              </div>
            </div>
          )}

          {/* TAB 4: Security & Password */}
          {activeTab === 'Security & Password' && (
            <div className="w-full max-w-xl">
              <ChangePasswordForm
                title="Admin Account Password"
                subtitle="Change your Education Administrator password across Supabase Auth"
                variant="plain"
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
