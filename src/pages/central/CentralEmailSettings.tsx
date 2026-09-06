import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Mail, CheckCircle2, Send, Terminal, Globe, Server,
  Key, Save, Copy, Check,
  Zap, Database, Eye, EyeOff, Sliders,
  GraduationCap, Snowflake, Monitor
} from 'lucide-react';
import {
  type EmailProviderType,
  type GlobalEmailConfig,
  DEFAULT_EMAIL_CONFIG,
  getGlobalEmailConfig,
  saveGlobalEmailConfig,
  sendTestEmail,
  type TestEmailResult,
  SQL_SCHEMA_EMAIL_CONFIG
} from '../../lib/api/emailSettings';

interface ProviderCardInfo {
  id: EmailProviderType;
  name: string;
  badge: string;
  tagline: string;
  logoColor: string;
  description: string;
  defaultHost: string;
  defaultPort: number;
}

const PROVIDERS: ProviderCardInfo[] = [
  {
    id: 'resend',
    name: 'Resend',
    badge: 'Recommended',
    tagline: 'Developer-First Email API',
    logoColor: 'text-black bg-slate-100 border-slate-300',
    description: 'Ultra-fast REST API with first-class React Email support, domain DKIM verification, and instant deliverability.',
    defaultHost: 'smtp.resend.com',
    defaultPort: 465,
  },
  {
    id: 'brevo',
    name: 'Brevo',
    badge: 'Sendinblue',
    tagline: 'Enterprise SMTP & Marketing Relay',
    logoColor: 'text-emerald-700 bg-emerald-50 border-emerald-200',
    description: 'High-throughput transactional mail relay with dedicated IP pools, SPF/DMARC routing, and EU GDPR compliance.',
    defaultHost: 'smtp-relay.brevo.com',
    defaultPort: 587,
  },
  {
    id: 'aws_ses',
    name: 'AWS SES',
    badge: 'Amazon Cloud',
    tagline: 'Amazon Simple Email Service',
    logoColor: 'text-amber-700 bg-amber-50 border-amber-200',
    description: 'Cost-effective, hyperscale cloud email infrastructure with multi-region failover across EU, US, and Asia-Pacific.',
    defaultHost: 'email-smtp.eu-central-1.amazonaws.com',
    defaultPort: 587,
  },
  {
    id: 'sendgrid',
    name: 'Twilio SendGrid',
    badge: 'Enterprise',
    tagline: 'Proven Transactional API',
    logoColor: 'text-blue-700 bg-blue-50 border-blue-200',
    description: 'Industry-standard email deliverability engine with real-time webhooks, bounce handling, and spam score analyzer.',
    defaultHost: 'smtp.sendgrid.net',
    defaultPort: 587,
  },
  {
    id: 'postmark',
    name: 'Postmark',
    badge: 'Instant Delivery',
    tagline: 'Zero-Delay Transactional Mail',
    logoColor: 'text-yellow-800 bg-yellow-50 border-yellow-200',
    description: 'Dedicated solely to transactional alerts with sub-second time-to-inbox and 45-day searchable delivery logs.',
    defaultHost: 'smtp.postmarkapp.com',
    defaultPort: 587,
  },
  {
    id: 'custom_smtp',
    name: 'Custom SMTP Server',
    badge: 'Self-Hosted',
    tagline: 'Private On-Premises Mail Relay',
    logoColor: 'text-purple-700 bg-purple-50 border-purple-200',
    description: 'Connect direct to internal Postfix, Haraka, Microsoft Exchange, or Google Workspace relay with custom TLS.',
    defaultHost: 'mail.ferexventures.com',
    defaultPort: 465,
  },
];

export const CentralEmailSettings: React.FC = () => {
  const [config, setConfig] = useState<GlobalEmailConfig>(DEFAULT_EMAIL_CONFIG);
  const [selectedProviderTab, setSelectedProviderTab] = useState<EmailProviderType>('resend');
  const [activeSection, setActiveSection] = useState<'providers' | 'senders' | 'advanced' | 'schema'>('providers');
  const [, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState('');
  const [showPassword, setShowPassword] = useState<Record<string, boolean>>({});
  const [copiedSql, setCopiedSql] = useState(false);

  // Test Email State
  const [showTestModal, setShowTestModal] = useState(false);
  const [testRecipient, setTestRecipient] = useState('superadmin@ferexventures.com');
  const [testDivision, setTestDivision] = useState<'general' | 'education' | 'trade' | 'rimi' | 'digital'>('general');
  const [testingDispatch, setTestingDispatch] = useState(false);
  const [testResult, setTestResult] = useState<TestEmailResult | null>(null);

  const showToastMsg = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(''), 3500);
  };

  useEffect(() => {
    getGlobalEmailConfig().then((data) => {
      setConfig(data);
      setSelectedProviderTab(data.activeProvider || 'resend');
      setLoading(false);
    });
  }, []);

  const handleSave = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setSaving(true);
    try {
      const saved = await saveGlobalEmailConfig(config, 'Super Admin HQ');
      setConfig(saved);
      showToastMsg(`✓ Email provider settings saved! Active Provider: ${saved.activeProvider.toUpperCase()}`);
    } catch {
      showToastMsg('Failed to save email configuration');
    } finally {
      setSaving(false);
    }
  };

  const setActiveProvider = (providerId: EmailProviderType) => {
    setConfig({ ...config, activeProvider: providerId });
    setSelectedProviderTab(providerId);
    showToastMsg(`Active provider switched to ${providerId.toUpperCase()}. Click Save to persist.`);
  };

  const updateProviderCreds = (providerId: EmailProviderType, field: string, value: any) => {
    setConfig({
      ...config,
      providers: {
        ...config.providers,
        [providerId]: {
          ...config.providers[providerId],
          [field]: value,
        },
      },
    });
  };

  const updateDivisionRouting = (field: keyof GlobalEmailConfig['divisionRouting'], value: string) => {
    setConfig({
      ...config,
      divisionRouting: {
        ...config.divisionRouting,
        [field]: value,
      },
    });
  };

  const togglePasswordVisibility = (key: string) => {
    setShowPassword((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const handleSendTest = async () => {
    if (!testRecipient.trim()) return;
    setTestingDispatch(true);
    setTestResult(null);
    try {
      const result = await sendTestEmail({
        recipientEmail: testRecipient.trim(),
        provider: config.activeProvider,
        config,
        division: testDivision,
      });
      setTestResult(result);
      if (result.success) {
        showToastMsg(`✓ Test email delivered to ${testRecipient}! (Latency: ${result.latencyMs}ms)`);
      }
    } finally {
      setTestingDispatch(false);
    }
  };

  const copySqlToClipboard = () => {
    navigator.clipboard.writeText(SQL_SCHEMA_EMAIL_CONFIG);
    setCopiedSql(true);
    setTimeout(() => setCopiedSql(false), 2500);
    showToastMsg('Supabase SQL Schema copied to clipboard');
  };

  const activeProviderMeta = PROVIDERS.find((p) => p.id === config.activeProvider) || PROVIDERS[0];
  const currentTabMeta = PROVIDERS.find((p) => p.id === selectedProviderTab) || PROVIDERS[0];

  return (
    <div className="space-y-6 text-left antialiased">
      {/* Toast Notification */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed top-20 right-8 z-50 bg-[#6A1B2E] text-white text-xs font-bold px-4 py-2.5 rounded-xl shadow-xl flex items-center gap-2 border border-white/20"
          >
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            {toast}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-black text-slate-900 tracking-tight flex items-center gap-2">
              <Mail className="w-6 h-6 text-[#6A1B2E]" /> Superadmin Email Provider & SMTP Settings
            </h1>
            <span className="text-[10px] font-black bg-[#6A1B2E]/10 text-[#6A1B2E] border border-[#6A1B2E]/20 px-2.5 py-0.5 rounded-full uppercase">
              RLS SuperAdmin Protected
            </span>
          </div>
          <p className="text-xs font-semibold text-slate-500 mt-1">
            Configure active email delivery infrastructure (Resend, Brevo, AWS SES, SendGrid, Postmark, SMTP) across all 4 subsidiaries.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => setShowTestModal(true)}
            className="flex items-center gap-1.5 px-4 py-2 text-xs font-black text-[#6A1B2E] bg-[#6A1B2E]/10 hover:bg-[#6A1B2E]/15 border border-[#6A1B2E]/20 rounded-xl transition-all cursor-pointer"
          >
            <Send className="w-3.5 h-3.5" /> Send Test Email
          </button>
          <button
            onClick={() => handleSave()}
            disabled={saving}
            className="flex items-center gap-1.5 px-5 py-2 text-xs font-black text-white bg-[#6A1B2E] hover:bg-[#521221] rounded-xl shadow-md shadow-[#6A1B2E]/20 transition-all cursor-pointer disabled:opacity-50"
          >
            <Save className="w-3.5 h-3.5" /> {saving ? 'Saving...' : 'Save Configuration'}
          </button>
        </div>
      </div>

      {/* Active Provider Indicator Bar */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-[#6A1B2E] text-white p-4 rounded-2xl shadow-sm flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-white/10 backdrop-blur-md flex items-center justify-center text-emerald-400 font-black">
            <Zap className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-black tracking-wider uppercase text-slate-300">Live Active Gateway:</span>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-black bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 flex items-center gap-1">
                <Check className="w-3 h-3" /> {activeProviderMeta.name}
              </span>
              <span className={`px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider ${config.environment === 'live' ? 'bg-emerald-500 text-slate-900' : 'bg-amber-400 text-slate-900'}`}>
                {config.environment}
              </span>
            </div>
            <p className="text-[11px] text-slate-300 mt-0.5">
              All 4 subsidiary transactional emails are currently being routed through <strong className="text-white">{activeProviderMeta.name}</strong>.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Environment Switcher */}
          <div className="flex items-center bg-black/30 p-1 rounded-xl border border-white/10 text-xs font-bold">
            <button
              onClick={() => setConfig({ ...config, environment: 'live' })}
              className={`px-3 py-1 rounded-lg transition-colors cursor-pointer ${config.environment === 'live' ? 'bg-emerald-500 text-slate-950 font-black shadow-xs' : 'text-slate-300 hover:text-white'}`}
            >
              Live Mode
            </button>
            <button
              onClick={() => setConfig({ ...config, environment: 'sandbox' })}
              className={`px-3 py-1 rounded-lg transition-colors cursor-pointer ${config.environment === 'sandbox' ? 'bg-amber-400 text-slate-950 font-black shadow-xs' : 'text-slate-300 hover:text-white'}`}
            >
              Sandbox Mode
            </button>
          </div>
        </div>
      </div>

      {/* Navigation Sub-Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200">
        {[
          { id: 'providers', label: '1. Email Providers & API Keys', icon: Server },
          { id: 'senders', label: '2. Senders & Division Aliases', icon: Globe },
          { id: 'advanced', label: '3. TLS & Rate Limiting', icon: Sliders },
          { id: 'schema', label: '4. Supabase RLS Schema', icon: Database },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeSection === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveSection(tab.id as any)}
              className={`flex items-center gap-2 px-4 py-3 text-xs font-black border-b-2 transition-all cursor-pointer ${
                isActive
                  ? 'border-[#6A1B2E] text-[#6A1B2E]'
                  : 'border-transparent text-slate-500 hover:text-slate-900 hover:border-slate-300'
              }`}
            >
              <Icon className="w-4 h-4" /> {tab.label}
            </button>
          );
        })}
      </div>

      {/* SECTION 1: PROVIDERS & MULTI-SWITCHER */}
      {activeSection === 'providers' && (
        <div className="space-y-6">
          {/* Provider Grid Cards */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <div>
                <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider">Select & Configure Provider</h3>
                <p className="text-xs text-slate-500">Choose a delivery service to edit credentials or activate as master relay.</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
              {PROVIDERS.map((provider) => {
                const isSelected = selectedProviderTab === provider.id;
                const isActive = config.activeProvider === provider.id;

                return (
                  <div
                    key={provider.id}
                    onClick={() => setSelectedProviderTab(provider.id)}
                    className={`p-4 rounded-2xl border-2 transition-all cursor-pointer relative flex flex-col justify-between ${
                      isSelected
                        ? 'bg-slate-50/80 border-[#6A1B2E] shadow-md shadow-[#6A1B2E]/5'
                        : 'bg-white border-slate-200/80 hover:border-slate-300 hover:shadow-xs'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className={`px-2.5 py-0.5 rounded-lg text-[10px] font-black border ${provider.logoColor}`}>
                          {provider.name}
                        </span>
                        {isActive && (
                          <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[9.5px] font-black bg-emerald-50 text-emerald-700 border border-emerald-300">
                            <Check className="w-3 h-3" /> ACTIVE GATEWAY
                          </span>
                        )}
                      </div>

                      <h4 className="text-sm font-extrabold text-slate-900">{provider.name}</h4>
                      <p className="text-[11px] font-medium text-slate-500 mt-1 line-clamp-2">{provider.description}</p>
                    </div>

                    <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
                      <span className="text-[10px] font-mono font-bold text-slate-400">
                        {provider.defaultHost}:{provider.defaultPort}
                      </span>
                      {isActive ? (
                        <span className="text-[10px] font-black text-emerald-600">Active</span>
                      ) : (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setActiveProvider(provider.id);
                          }}
                          className="px-2.5 py-1 text-[10px] font-black text-slate-700 bg-slate-100 hover:bg-[#6A1B2E] hover:text-white rounded-lg transition-colors cursor-pointer"
                        >
                          Set as Active
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Dynamic Provider Form */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-5">
              <div className="flex items-center gap-3">
                <div className={`p-2.5 rounded-xl border ${currentTabMeta.logoColor}`}>
                  <Server className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900">{currentTabMeta.name} Credentials & Settings</h3>
                  <p className="text-xs text-slate-500 font-medium">{currentTabMeta.tagline}</p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {config.activeProvider !== selectedProviderTab ? (
                  <button
                    onClick={() => setActiveProvider(selectedProviderTab)}
                    className="flex items-center gap-1 px-3.5 py-1.5 text-xs font-black text-white bg-[#6A1B2E] hover:bg-[#521221] rounded-xl shadow-xs transition-colors cursor-pointer"
                  >
                    <Check className="w-3.5 h-3.5" /> Set {currentTabMeta.name} as Active Provider
                  </button>
                ) : (
                  <span className="flex items-center gap-1.5 px-3 py-1 text-xs font-black bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-xl">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Currently Active Gateway
                  </span>
                )}
              </div>
            </div>

            {/* Provider specific inputs */}
            <div className="space-y-4">
              {/* 1. RESEND */}
              {selectedProviderTab === 'resend' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="md:col-span-2">
                    <label className="block text-[10px] font-extrabold text-slate-500 uppercase tracking-wider mb-1">
                      Resend API Key (re_*) *
                    </label>
                    <div className="relative">
                      <Key className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                      <input
                        type={showPassword['resend'] ? 'text' : 'password'}
                        value={config.providers.resend.apiKey || ''}
                        onChange={(e) => updateProviderCreds('resend', 'apiKey', e.target.value)}
                        placeholder="re_live_..."
                        className="w-full h-10 pl-9 pr-10 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-semibold text-slate-900 focus:bg-white focus:outline-none focus:border-[#6A1B2E]"
                      />
                      <button
                        type="button"
                        onClick={() => togglePasswordVisibility('resend')}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                      >
                        {showPassword['resend'] ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] font-extrabold text-slate-500 uppercase tracking-wider mb-1">
                      SMTP Relay Host
                    </label>
                    <input
                      type="text"
                      value={config.providers.resend.smtpHost || 'smtp.resend.com'}
                      onChange={(e) => updateProviderCreds('resend', 'smtpHost', e.target.value)}
                      className="w-full h-10 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-semibold text-slate-900"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-extrabold text-slate-500 uppercase tracking-wider mb-1">
                      SMTP Port & Security
                    </label>
                    <input
                      type="number"
                      value={config.providers.resend.smtpPort || 465}
                      onChange={(e) => updateProviderCreds('resend', 'smtpPort', parseInt(e.target.value))}
                      className="w-full h-10 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-semibold text-slate-900"
                    />
                  </div>
                </div>
              )}

              {/* 2. BREVO (Sendinblue) */}
              {selectedProviderTab === 'brevo' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="md:col-span-2">
                    <label className="block text-[10px] font-extrabold text-slate-500 uppercase tracking-wider mb-1">
                      Brevo API Key (v3) *
                    </label>
                    <div className="relative">
                      <Key className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                      <input
                        type={showPassword['brevo'] ? 'text' : 'password'}
                        value={config.providers.brevo.apiKey || ''}
                        onChange={(e) => updateProviderCreds('brevo', 'apiKey', e.target.value)}
                        placeholder="xkeysib-..."
                        className="w-full h-10 pl-9 pr-10 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-semibold text-slate-900 focus:bg-white focus:outline-none focus:border-[#6A1B2E]"
                      />
                      <button
                        type="button"
                        onClick={() => togglePasswordVisibility('brevo')}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                      >
                        {showPassword['brevo'] ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] font-extrabold text-slate-500 uppercase tracking-wider mb-1">
                      SMTP Login / User
                    </label>
                    <input
                      type="text"
                      value={config.providers.brevo.smtpUser || ''}
                      onChange={(e) => updateProviderCreds('brevo', 'smtpUser', e.target.value)}
                      placeholder="e.g. 784f98@smtp-brevo.com"
                      className="w-full h-10 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-semibold text-slate-900"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-extrabold text-slate-500 uppercase tracking-wider mb-1">
                      SMTP Master Password / Master Key
                    </label>
                    <input
                      type={showPassword['brevo_smtp'] ? 'text' : 'password'}
                      value={config.providers.brevo.smtpPassword || ''}
                      onChange={(e) => updateProviderCreds('brevo', 'smtpPassword', e.target.value)}
                      placeholder="••••••••••••••••••••"
                      className="w-full h-10 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-semibold text-slate-900"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-extrabold text-slate-500 uppercase tracking-wider mb-1">
                      SMTP Relay Host
                    </label>
                    <input
                      type="text"
                      value={config.providers.brevo.smtpHost || 'smtp-relay.brevo.com'}
                      onChange={(e) => updateProviderCreds('brevo', 'smtpHost', e.target.value)}
                      className="w-full h-10 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-semibold text-slate-900"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-extrabold text-slate-500 uppercase tracking-wider mb-1">
                      SMTP Port (587 STARTTLS / 465 SSL)
                    </label>
                    <input
                      type="number"
                      value={config.providers.brevo.smtpPort || 587}
                      onChange={(e) => updateProviderCreds('brevo', 'smtpPort', parseInt(e.target.value))}
                      className="w-full h-10 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-semibold text-slate-900"
                    />
                  </div>
                </div>
              )}

              {/* 3. AWS SES */}
              {selectedProviderTab === 'aws_ses' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-extrabold text-slate-500 uppercase tracking-wider mb-1">
                      AWS Access Key ID *
                    </label>
                    <input
                      type="text"
                      value={config.providers.aws_ses.apiKey || ''}
                      onChange={(e) => updateProviderCreds('aws_ses', 'apiKey', e.target.value)}
                      placeholder="AKIAIOSFODNN7EXAMPLE"
                      className="w-full h-10 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-semibold text-slate-900"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-extrabold text-slate-500 uppercase tracking-wider mb-1">
                      AWS Secret Access Key *
                    </label>
                    <div className="relative">
                      <input
                        type={showPassword['aws_ses'] ? 'text' : 'password'}
                        value={config.providers.aws_ses.apiSecret || ''}
                        onChange={(e) => updateProviderCreds('aws_ses', 'apiSecret', e.target.value)}
                        placeholder="wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY"
                        className="w-full h-10 px-3 pr-10 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-semibold text-slate-900"
                      />
                      <button
                        type="button"
                        onClick={() => togglePasswordVisibility('aws_ses')}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                      >
                        {showPassword['aws_ses'] ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] font-extrabold text-slate-500 uppercase tracking-wider mb-1">
                      AWS Region
                    </label>
                    <select
                      value={config.providers.aws_ses.region || 'eu-central-1'}
                      onChange={(e) => updateProviderCreds('aws_ses', 'region', e.target.value)}
                      className="w-full h-10 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900"
                    >
                      <option value="eu-central-1">eu-central-1 (Frankfurt)</option>
                      <option value="eu-west-1">eu-west-1 (Ireland)</option>
                      <option value="us-east-1">us-east-1 (N. Virginia)</option>
                      <option value="us-west-2">us-west-2 (Oregon)</option>
                      <option value="ap-south-1">ap-south-1 (Mumbai)</option>
                      <option value="ap-southeast-1">ap-southeast-1 (Singapore)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[10px] font-extrabold text-slate-500 uppercase tracking-wider mb-1">
                      SES SMTP Endpoint
                    </label>
                    <input
                      type="text"
                      value={config.providers.aws_ses.smtpHost || `email-smtp.${config.providers.aws_ses.region || 'eu-central-1'}.amazonaws.com`}
                      onChange={(e) => updateProviderCreds('aws_ses', 'smtpHost', e.target.value)}
                      className="w-full h-10 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-semibold text-slate-900"
                    />
                  </div>
                </div>
              )}

              {/* 4. SENDGRID */}
              {selectedProviderTab === 'sendgrid' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="md:col-span-2">
                    <label className="block text-[10px] font-extrabold text-slate-500 uppercase tracking-wider mb-1">
                      SendGrid API Key (SG.*) *
                    </label>
                    <input
                      type={showPassword['sendgrid'] ? 'text' : 'password'}
                      value={config.providers.sendgrid.apiKey || ''}
                      onChange={(e) => updateProviderCreds('sendgrid', 'apiKey', e.target.value)}
                      placeholder="SG.xxxxxxxxxxxxxxxxxxxxxxxx..."
                      className="w-full h-10 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-semibold text-slate-900"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-extrabold text-slate-500 uppercase tracking-wider mb-1">
                      SMTP Host
                    </label>
                    <input
                      type="text"
                      value={config.providers.sendgrid.smtpHost || 'smtp.sendgrid.net'}
                      onChange={(e) => updateProviderCreds('sendgrid', 'smtpHost', e.target.value)}
                      className="w-full h-10 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-semibold text-slate-900"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-extrabold text-slate-500 uppercase tracking-wider mb-1">
                      SMTP Port
                    </label>
                    <input
                      type="number"
                      value={config.providers.sendgrid.smtpPort || 587}
                      onChange={(e) => updateProviderCreds('sendgrid', 'smtpPort', parseInt(e.target.value))}
                      className="w-full h-10 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-semibold text-slate-900"
                    />
                  </div>
                </div>
              )}

              {/* 5. POSTMARK */}
              {selectedProviderTab === 'postmark' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="md:col-span-2">
                    <label className="block text-[10px] font-extrabold text-slate-500 uppercase tracking-wider mb-1">
                      Postmark Server API Token *
                    </label>
                    <input
                      type={showPassword['postmark'] ? 'text' : 'password'}
                      value={config.providers.postmark.apiKey || ''}
                      onChange={(e) => updateProviderCreds('postmark', 'apiKey', e.target.value)}
                      placeholder="9a8b7c6d-5e4f-3a2b-..."
                      className="w-full h-10 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-semibold text-slate-900"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-extrabold text-slate-500 uppercase tracking-wider mb-1">
                      SMTP Host
                    </label>
                    <input
                      type="text"
                      value={config.providers.postmark.smtpHost || 'smtp.postmarkapp.com'}
                      onChange={(e) => updateProviderCreds('postmark', 'smtpHost', e.target.value)}
                      className="w-full h-10 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-semibold text-slate-900"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-extrabold text-slate-500 uppercase tracking-wider mb-1">
                      SMTP Port
                    </label>
                    <input
                      type="number"
                      value={config.providers.postmark.smtpPort || 587}
                      onChange={(e) => updateProviderCreds('postmark', 'smtpPort', parseInt(e.target.value))}
                      className="w-full h-10 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-semibold text-slate-900"
                    />
                  </div>
                </div>
              )}

              {/* 6. CUSTOM SMTP */}
              {selectedProviderTab === 'custom_smtp' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-extrabold text-slate-500 uppercase tracking-wider mb-1">
                      SMTP Host / Server Name *
                    </label>
                    <input
                      type="text"
                      value={config.providers.custom_smtp.smtpHost || ''}
                      onChange={(e) => updateProviderCreds('custom_smtp', 'smtpHost', e.target.value)}
                      placeholder="mail.yourcompany.com"
                      className="w-full h-10 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-semibold text-slate-900"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-extrabold text-slate-500 uppercase tracking-wider mb-1">
                      SMTP Port (465 SSL, 587 STARTTLS, 25) *
                    </label>
                    <input
                      type="number"
                      value={config.providers.custom_smtp.smtpPort || 465}
                      onChange={(e) => updateProviderCreds('custom_smtp', 'smtpPort', parseInt(e.target.value))}
                      className="w-full h-10 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-semibold text-slate-900"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-extrabold text-slate-500 uppercase tracking-wider mb-1">
                      SMTP Username / Email
                    </label>
                    <input
                      type="text"
                      value={config.providers.custom_smtp.smtpUser || ''}
                      onChange={(e) => updateProviderCreds('custom_smtp', 'smtpUser', e.target.value)}
                      placeholder="smtp-user@yourcompany.com"
                      className="w-full h-10 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-semibold text-slate-900"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-extrabold text-slate-500 uppercase tracking-wider mb-1">
                      SMTP Password
                    </label>
                    <input
                      type={showPassword['custom_smtp'] ? 'text' : 'password'}
                      value={config.providers.custom_smtp.smtpPassword || ''}
                      onChange={(e) => updateProviderCreds('custom_smtp', 'smtpPassword', e.target.value)}
                      placeholder="••••••••••••••••••••"
                      className="w-full h-10 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-semibold text-slate-900"
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* SECTION 2: SENDERS & DIVISION ALIASES */}
      {activeSection === 'senders' && (
        <div className="space-y-6">
          {/* Global Master Sender */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs">
            <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider mb-1">
              Global Default Sender & Reply-To
            </h3>
            <p className="text-xs text-slate-500 mb-4">
              Fallback sender identity applied if a specific subsidiary sender address is not specified.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-[10px] font-extrabold text-slate-500 uppercase tracking-wider mb-1">
                  Global Sender Display Name *
                </label>
                <input
                  type="text"
                  value={config.globalSenderName}
                  onChange={(e) => setConfig({ ...config, globalSenderName: e.target.value })}
                  placeholder="Ferex Ventures Enterprise HQ"
                  className="w-full h-10 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900"
                />
              </div>

              <div>
                <label className="block text-[10px] font-extrabold text-slate-500 uppercase tracking-wider mb-1">
                  Global Sender Email *
                </label>
                <input
                  type="email"
                  value={config.globalSenderEmail}
                  onChange={(e) => setConfig({ ...config, globalSenderEmail: e.target.value })}
                  placeholder="notifications@ferexventures.com"
                  className="w-full h-10 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-semibold text-slate-900"
                />
              </div>

              <div>
                <label className="block text-[10px] font-extrabold text-slate-500 uppercase tracking-wider mb-1">
                  Reply-To Email Address
                </label>
                <input
                  type="email"
                  value={config.replyToEmail}
                  onChange={(e) => setConfig({ ...config, replyToEmail: e.target.value })}
                  placeholder="support@ferexventures.com"
                  className="w-full h-10 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-semibold text-slate-900"
                />
              </div>
            </div>
          </div>

          {/* Subsidiary Routing Aliases */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs">
            <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider mb-1">
              Subsidiary-Specific Sender Routing & Aliases
            </h3>
            <p className="text-xs text-slate-500 mb-4">
              Customize distinct branding, sender names, and verified domains for each of the 4 subsidiaries.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Education */}
              <div className="p-4 rounded-xl border border-rose-100 bg-rose-50/30 space-y-2.5">
                <div className="flex items-center gap-2 text-xs font-black text-rose-800 uppercase">
                  <GraduationCap className="w-4 h-4" /> 1. Ferex Education
                </div>
                <div>
                  <label className="block text-[9.5px] font-extrabold text-slate-500 uppercase mb-0.5">Sender Name</label>
                  <input
                    type="text"
                    value={config.divisionRouting.educationSenderName}
                    onChange={(e) => updateDivisionRouting('educationSenderName', e.target.value)}
                    className="w-full h-9 px-3 bg-white border border-rose-200 rounded-xl text-xs font-bold text-slate-900"
                  />
                </div>
                <div>
                  <label className="block text-[9.5px] font-extrabold text-slate-500 uppercase mb-0.5">Sender Email</label>
                  <input
                    type="email"
                    value={config.divisionRouting.educationSenderEmail}
                    onChange={(e) => updateDivisionRouting('educationSenderEmail', e.target.value)}
                    className="w-full h-9 px-3 bg-white border border-rose-200 rounded-xl text-xs font-mono font-semibold text-slate-900"
                  />
                </div>
              </div>

              {/* Global Trade */}
              <div className="p-4 rounded-xl border border-indigo-100 bg-indigo-50/30 space-y-2.5">
                <div className="flex items-center gap-2 text-xs font-black text-indigo-800 uppercase">
                  <Globe className="w-4 h-4" /> 2. Ferex Global Trade
                </div>
                <div>
                  <label className="block text-[9.5px] font-extrabold text-slate-500 uppercase mb-0.5">Sender Name</label>
                  <input
                    type="text"
                    value={config.divisionRouting.tradeSenderName}
                    onChange={(e) => updateDivisionRouting('tradeSenderName', e.target.value)}
                    className="w-full h-9 px-3 bg-white border border-indigo-200 rounded-xl text-xs font-bold text-slate-900"
                  />
                </div>
                <div>
                  <label className="block text-[9.5px] font-extrabold text-slate-500 uppercase mb-0.5">Sender Email</label>
                  <input
                    type="email"
                    value={config.divisionRouting.tradeSenderEmail}
                    onChange={(e) => updateDivisionRouting('tradeSenderEmail', e.target.value)}
                    className="w-full h-9 px-3 bg-white border border-indigo-200 rounded-xl text-xs font-mono font-semibold text-slate-900"
                  />
                </div>
              </div>

              {/* Rimi Frozen */}
              <div className="p-4 rounded-xl border border-cyan-100 bg-cyan-50/30 space-y-2.5">
                <div className="flex items-center gap-2 text-xs font-black text-cyan-800 uppercase">
                  <Snowflake className="w-4 h-4" /> 3. Rimi Frozen Distribution
                </div>
                <div>
                  <label className="block text-[9.5px] font-extrabold text-slate-500 uppercase mb-0.5">Sender Name</label>
                  <input
                    type="text"
                    value={config.divisionRouting.rimiSenderName}
                    onChange={(e) => updateDivisionRouting('rimiSenderName', e.target.value)}
                    className="w-full h-9 px-3 bg-white border border-cyan-200 rounded-xl text-xs font-bold text-slate-900"
                  />
                </div>
                <div>
                  <label className="block text-[9.5px] font-extrabold text-slate-500 uppercase mb-0.5">Sender Email</label>
                  <input
                    type="email"
                    value={config.divisionRouting.rimiSenderEmail}
                    onChange={(e) => updateDivisionRouting('rimiSenderEmail', e.target.value)}
                    className="w-full h-9 px-3 bg-white border border-cyan-200 rounded-xl text-xs font-mono font-semibold text-slate-900"
                  />
                </div>
              </div>

              {/* Ferex Digital */}
              <div className="p-4 rounded-xl border border-emerald-100 bg-emerald-50/30 space-y-2.5">
                <div className="flex items-center gap-2 text-xs font-black text-emerald-800 uppercase">
                  <Monitor className="w-4 h-4" /> 4. Ferex Digital
                </div>
                <div>
                  <label className="block text-[9.5px] font-extrabold text-slate-500 uppercase mb-0.5">Sender Name</label>
                  <input
                    type="text"
                    value={config.divisionRouting.digitalSenderName}
                    onChange={(e) => updateDivisionRouting('digitalSenderName', e.target.value)}
                    className="w-full h-9 px-3 bg-white border border-emerald-200 rounded-xl text-xs font-bold text-slate-900"
                  />
                </div>
                <div>
                  <label className="block text-[9.5px] font-extrabold text-slate-500 uppercase mb-0.5">Sender Email</label>
                  <input
                    type="email"
                    value={config.divisionRouting.digitalSenderEmail}
                    onChange={(e) => updateDivisionRouting('digitalSenderEmail', e.target.value)}
                    className="w-full h-9 px-3 bg-white border border-emerald-200 rounded-xl text-xs font-mono font-semibold text-slate-900"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SECTION 3: ADVANCED & TLS */}
      {activeSection === 'advanced' && (
        <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs space-y-5">
          <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider">
            Security, Rate Limiting & Webhooks
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-200">
              <div>
                <p className="text-xs font-black text-slate-900">Enforce TLS Encryption</p>
                <p className="text-[11px] text-slate-500">Require STARTTLS/SSL for all outbound SMTP relay connections.</p>
              </div>
              <input
                type="checkbox"
                checked={config.enforceTls}
                onChange={(e) => setConfig({ ...config, enforceTls: e.target.checked })}
                className="w-5 h-5 accent-[#6A1B2E] rounded cursor-pointer"
              />
            </div>

            <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-200">
              <div>
                <p className="text-xs font-black text-slate-900">Track Open & Click Events</p>
                <p className="text-[11px] text-slate-500">Inject invisible 1x1 telemetry pixel to verify student & buyer reads.</p>
              </div>
              <input
                type="checkbox"
                checked={config.trackOpensAndClicks}
                onChange={(e) => setConfig({ ...config, trackOpensAndClicks: e.target.checked })}
                className="w-5 h-5 accent-[#6A1B2E] rounded cursor-pointer"
              />
            </div>

            <div>
              <label className="block text-[10px] font-extrabold text-slate-500 uppercase tracking-wider mb-1">
                Rate Limit per Minute (Burst Cap)
              </label>
              <input
                type="number"
                value={config.rateLimitPerMinute}
                onChange={(e) => setConfig({ ...config, rateLimitPerMinute: parseInt(e.target.value) || 120 })}
                className="w-full h-10 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900"
              />
            </div>

            <div>
              <label className="block text-[10px] font-extrabold text-slate-500 uppercase tracking-wider mb-1">
                Webhook Signing Secret (Optional)
              </label>
              <input
                type="text"
                value={config.webhookSecret || ''}
                onChange={(e) => setConfig({ ...config, webhookSecret: e.target.value })}
                placeholder="whsec_..."
                className="w-full h-10 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-semibold text-slate-900"
              />
            </div>
          </div>
        </div>
      )}

      {/* SECTION 4: SUPABASE RLS SCHEMA */}
      {activeSection === 'schema' && (
        <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider flex items-center gap-2">
                <Database className="w-4 h-4 text-[#6A1B2E]" /> Supabase Table Schema & Row Level Security
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Table <code className="text-[#6A1B2E] font-bold">email_configurations</code> with strict SuperAdmin write isolation.
              </p>
            </div>
            <button
              onClick={copySqlToClipboard}
              className="flex items-center gap-1 px-3.5 py-1.5 text-xs font-black text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors cursor-pointer"
            >
              {copiedSql ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
              {copiedSql ? 'Copied SQL' : 'Copy DDL'}
            </button>
          </div>

          <div className="relative">
            <pre className="bg-slate-950 text-emerald-400 p-4 rounded-xl text-[11px] font-mono overflow-x-auto border border-slate-800 leading-relaxed max-h-96">
              {SQL_SCHEMA_EMAIL_CONFIG}
            </pre>
          </div>
        </div>
      )}

      {/* TEST EMAIL MODAL WITH LIVE DIAGNOSTIC TERMINAL */}
      <AnimatePresence>
        {showTestModal && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]"
            >
              <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
                <div className="flex items-center gap-2">
                  <Send className="w-4 h-4 text-[#6A1B2E]" />
                  <span className="text-xs font-black text-slate-900 uppercase">
                    Test Gateway Dispatcher ({config.activeProvider.toUpperCase()})
                  </span>
                </div>
                <button
                  onClick={() => setShowTestModal(false)}
                  className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition-colors"
                >
                  ✕
                </button>
              </div>

              <div className="p-5 space-y-4 overflow-y-auto">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-extrabold text-slate-500 uppercase tracking-wider mb-1">
                      Recipient Email Address *
                    </label>
                    <input
                      type="email"
                      value={testRecipient}
                      onChange={(e) => setTestRecipient(e.target.value)}
                      placeholder="admin@yourdomain.com"
                      className="w-full h-9 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-semibold text-slate-900 focus:bg-white focus:outline-none focus:border-[#6A1B2E]"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-extrabold text-slate-500 uppercase tracking-wider mb-1">
                      Division Template Persona
                    </label>
                    <select
                      value={testDivision}
                      onChange={(e) => setTestDivision(e.target.value as any)}
                      className="w-full h-9 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900"
                    >
                      <option value="general">Global HQ Dispatch</option>
                      <option value="education">Ferex Education (Admissions)</option>
                      <option value="trade">Global Trade (Bill of Lading)</option>
                      <option value="rimi">Rimi Frozen (Cold Chain Telemetry)</option>
                      <option value="digital">Ferex Digital (Milestone Notice)</option>
                    </select>
                  </div>
                </div>

                <div className="flex items-center justify-between p-3 bg-slate-100 rounded-xl text-xs">
                  <div className="flex items-center gap-2">
                    <Server className="w-4 h-4 text-slate-500" />
                    <span className="font-bold text-slate-700">Active Target Gateway:</span>
                    <span className="font-black text-[#6A1B2E]">{activeProviderMeta.name}</span>
                  </div>
                  <button
                    onClick={handleSendTest}
                    disabled={testingDispatch}
                    className="flex items-center gap-1.5 px-4 py-1.5 text-xs font-black text-white bg-[#6A1B2E] hover:bg-[#521221] rounded-xl shadow-xs transition-colors cursor-pointer disabled:opacity-50"
                  >
                    {testingDispatch ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                    {testingDispatch ? 'Testing Gateway...' : 'Dispatch Test Email'}
                  </button>
                </div>

                {/* Diagnostic Terminal View */}
                {testResult && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-[11px] font-black uppercase tracking-wider">
                      <span className="text-slate-500 flex items-center gap-1">
                        <Terminal className="w-3.5 h-3.5" /> Edge Gateway Diagnostic Log
                      </span>
                      <span className={testResult.success ? 'text-emerald-600' : 'text-red-600'}>
                        {testResult.success ? `✓ HTTP ${testResult.statusCode} OK (${testResult.latencyMs}ms)` : '✕ Dispatch Failed'}
                      </span>
                    </div>

                    <div className="bg-slate-950 p-3.5 rounded-xl text-[11px] font-mono text-emerald-400 space-y-1 max-h-48 overflow-y-auto border border-slate-800">
                      {testResult.diagnosticLog.map((log, idx) => (
                        <div key={idx} className="leading-snug">
                          {log}
                        </div>
                      ))}
                      {testResult.messageId && (
                        <div className="text-cyan-400 font-bold pt-1 border-t border-slate-800 mt-1">
                          [MESSAGE_ID] {testResult.messageId}
                        </div>
                      )}
                      {testResult.error && (
                        <div className="text-red-400 font-bold pt-1 border-t border-slate-800 mt-1">
                          [ERROR_DETAIL] {testResult.error}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>

              <div className="p-4 border-t border-slate-100 flex justify-end bg-slate-50">
                <button
                  onClick={() => setShowTestModal(false)}
                  className="px-4 py-1.5 text-xs font-bold text-slate-600 hover:bg-slate-200 rounded-xl transition-colors cursor-pointer"
                >
                  Close Diagnostic Modal
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
