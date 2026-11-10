import React, { useState, useEffect } from 'react';
import {
  Save, CheckCircle2, Building2, Shield, Lock, MessageSquare,
  Check, Sliders, Phone, Key, Globe, Send, AlertCircle
} from 'lucide-react';
import { ChangePasswordForm } from '../../components/ChangePasswordForm';
import { ToastNotification } from '../../components/ToastNotification';
import { Button } from '../../components/Button';
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
  'Security & Password': <Shield className="w-4 h-4 text-[#58051E]" />,
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

  useEffect(() => {
    getLeadFormConfig().then((cfg) => setFormConfig(cfg));
    getWhatsAppConfig().then((wcfg) => setWhatsappConfig(wcfg));
  }, []);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(''), 3500);
  };

  const handleSaveLeadForm = async () => {
    setIsSavingForm(true);
    try {
      await saveLeadFormConfig(formConfig);
      showToast('✅ Lead capture form settings updated & synchronized across landing page!');
    } catch (err: any) {
      showToast(`Error saving lead form settings: ${err.message}`);
    } finally {
      setIsSavingForm(false);
    }
  };

  const handleSaveWhatsApp = async () => {
    setIsSavingWhatsApp(true);
    try {
      await saveWhatsAppConfig(whatsappConfig);
      showToast('✅ WhatsApp API gateway credentials & welcome message template saved!');
    } catch (err: any) {
      showToast(`Error saving WhatsApp config: ${err.message}`);
    } finally {
      setIsSavingWhatsApp(false);
    }
  };

  const handleTestWhatsApp = async () => {
    if (!testPhoneNumber || testPhoneNumber.length < 8) {
      showToast('Please enter a valid phone number with country code for testing.');
      return;
    }
    setIsTestingWhatsApp(true);
    try {
      const res = await testWhatsAppConnection(testPhoneNumber);
      showToast(res.message);
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
              className="w-full h-10 px-3.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:outline-none focus:border-[#58051E]/50 focus:bg-white transition-all"
            />
          </div>
        ))}
        <div>
          <label className="block text-[10px] font-extrabold text-slate-500 uppercase tracking-wider mb-1.5">Timezone</label>
          <select
            value={org.timezone}
            onChange={(e) => setOrg({ ...org, timezone: e.target.value })}
            className="w-full h-10 px-3.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:outline-none focus:border-[#58051E]/50 focus:bg-white cursor-pointer"
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
            className="w-full h-10 px-3.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:outline-none focus:border-[#58051E]/50 focus:bg-white cursor-pointer"
          >
            <option>English</option>
            <option>Arabic</option>
            <option>Hindi</option>
          </select>
        </div>
      </div>
      <div className="pt-3 border-t border-slate-100 flex justify-end">
        <button
          onClick={() => showToast('Organization settings saved!')}
          className="flex items-center gap-2 h-10 px-5 bg-[#58051E] hover:bg-[#430316] text-white text-xs font-bold rounded-xl transition-all shadow-xs cursor-pointer"
        >
          <Save className="w-4 h-4" /> Save Organization Settings
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
          <h1 className="text-xl font-black text-slate-900 tracking-tight">Education Admin Settings</h1>
          <p className="text-xs font-medium text-slate-500 mt-0.5">
            Manage your organization profile, lead capture form controls, WhatsApp API automations, and credentials.
          </p>
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
                    ? 'bg-[#58051E] text-white shadow-xs font-black'
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
                  <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
                    Live Form Sync
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
                      <div className="w-10 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#58051E]" />
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
                      <div className="w-10 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#58051E]" />
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
                      <div className="w-10 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#58051E]" />
                    </label>
                  </div>

                  {/* Degree Level Toggle */}
                  <div className="flex items-center justify-between p-3 bg-white rounded-xl border border-slate-200 shadow-2xs">
                    <div>
                      <span className="text-xs font-black text-slate-900 block">Degree Level Selection</span>
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
                      <div className="w-10 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#58051E]" />
                    </label>
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
                      Form Card Headline
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
                  className="bg-[#58051E] hover:bg-[#430316] text-white text-xs font-bold"
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
                  <span className="text-[10px] font-bold text-cyan-700 bg-cyan-50 px-2.5 py-0.5 rounded-full border border-cyan-200">
                    Auto-Responder Active
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
                    className="w-full h-10 px-3.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:border-[#58051E]"
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

              {/* Welcome Message Template */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-[10px] font-extrabold text-slate-500 uppercase tracking-wider">
                    Automated Welcome Message Template
                  </label>
                  <div className="text-[10px] text-slate-400 space-x-1">
                    <span>Variables:</span>
                    <span className="font-mono text-[#58051E] bg-[#58051E]/10 px-1 rounded">{`{student_name}`}</span>
                    <span className="font-mono text-[#58051E] bg-[#58051E]/10 px-1 rounded">{`{country}`}</span>
                    <span className="font-mono text-[#58051E] bg-[#58051E]/10 px-1 rounded">{`{degree}`}</span>
                    <span className="font-mono text-[#58051E] bg-[#58051E]/10 px-1 rounded">{`{counselor_name}`}</span>
                  </div>
                </div>
                <textarea
                  rows={6}
                  value={whatsappConfig.welcome_message_template}
                  onChange={(e) => setWhatsappConfig({ ...whatsappConfig, welcome_message_template: e.target.value })}
                  className="w-full p-3.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:outline-none focus:border-[#58051E] leading-relaxed"
                />
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
                  className="bg-[#58051E] hover:bg-[#430316] text-white text-xs font-bold"
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
