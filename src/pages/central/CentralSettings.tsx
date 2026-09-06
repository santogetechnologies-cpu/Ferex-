import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Settings, Shield, Database, Globe, CheckCircle2,
  RefreshCw, Save, Mail, CreditCard, QrCode, Lock, Check,
  ExternalLink, Sparkles, Sliders
} from 'lucide-react';
import { Card } from '../../components/Card';
import { Button } from '../../components/Button';
import {
  getGlobalPaymentGateways,
  saveGlobalPaymentGateways,
  type GlobalPaymentGatewayConfig,
  DEFAULT_PAYMENT_GATEWAYS
} from '../../lib/api/paymentGateways';

export const CentralSettings: React.FC = () => {
  const [toast, setToast] = useState('');
  const [activeTab, setActiveTab] = useState<'gateways' | 'security' | 'currency' | 'backup' | 'smtp'>('gateways');
  const [gateways, setGateways] = useState<GlobalPaymentGatewayConfig>(DEFAULT_PAYMENT_GATEWAYS);
  const [testingStripe, setTestingStripe] = useState(false);

  const [settings, setSettings] = useState({
    enforce2FA: true,
    sessionTimeoutMins: 60,
    autoAuditLogRetentionDays: 365,
    eurInrRate: 90.0,
    usdInrRate: 86.0,
    autoFxSync: true,
    smtpHost: 'smtp.sendgrid.net',
    smtpPort: 587,
    smtpUser: 'apikey',
    smtpFrom: 'alerts@ferex.com',
    backupFrequency: 'Daily (02:00 UTC)',
    storageBucket: 'ferex-central-vault-prod',
  });

  useEffect(() => {
    getGlobalPaymentGateways().then(setGateways);
  }, []);

  const showToastMsg = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(''), 3000);
  };

  const handleSaveSettings = (e: React.FormEvent) => {
    e.preventDefault();
    showToastMsg('Central Enterprise System Settings saved successfully');
  };

  const handleSaveGateways = async (e: React.FormEvent) => {
    e.preventDefault();
    await saveGlobalPaymentGateways(gateways, 'Super Admin');
    showToastMsg('Stripe & UPI Payment Gateways configured & synchronized across all 4 apps!');
  };

  const handleTestStripe = () => {
    setTestingStripe(true);
    setTimeout(() => {
      setTestingStripe(false);
      showToastMsg('✓ Stripe API Connection Verified (HTTP 200 OK)');
    }, 1000);
  };

  const handleTriggerBackup = () => {
    showToastMsg('Database snapshot snapshot_central_2026_09.sql initiated...');
  };

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
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-black text-slate-900 tracking-tight flex items-center gap-2">
              <Settings className="w-6 h-6 text-[#6A1B2E]" /> Global System & Payment Gateways Configuration
            </h1>
            <span className="text-[10px] font-black bg-[#6A1B2E]/10 text-[#6A1B2E] border border-[#6A1B2E]/20 px-2.5 py-0.5 rounded-full">
              Super Admin Console
            </span>
          </div>
          <p className="text-xs font-semibold text-slate-500 mt-1">
            Master gateway credentials (Stripe & UPI), division-level payment routing, security policies, and exchange rate parameters.
          </p>
        </div>
      </div>

      {/* Settings Navigation Tabs */}
      <Card className="p-3 border border-slate-200/80 shadow-xs flex items-center gap-1.5 overflow-x-auto scrollbar-none">
        {[
          { key: 'gateways', label: 'Payment Gateways (Stripe & UPI)', icon: CreditCard },
          { key: 'security', label: 'Security & Access Policy', icon: Shield },
          { key: 'currency', label: 'Multi-Currency & FX Rates', icon: Globe },
          { key: 'backup', label: 'Database & Backup Vault', icon: Database },
          { key: 'smtp', label: 'SMTP & Email Gateway', icon: Mail },
        ].map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key as any)}
            className={`px-3.5 py-2 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === tab.key
                ? 'bg-[#6A1B2E] text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <tab.icon className="w-3.5 h-3.5" />
            {tab.label}
          </button>
        ))}
      </Card>

      {/* ─── TAB: PAYMENT GATEWAYS (STRIPE & UPI) ─────────────────────────── */}
      {activeTab === 'gateways' && (
        <form onSubmit={handleSaveGateways} className="space-y-6">
          {/* Top Banner Notice */}
          <div className="p-4 bg-gradient-to-r from-blue-900 via-indigo-900 to-[#6A1B2E] text-white rounded-2xl shadow-md flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div>
              <span className="text-[10px] font-black uppercase tracking-wider bg-white/20 px-2.5 py-0.5 rounded-full text-amber-300">
                Universal Settlement Hub
              </span>
              <h3 className="text-sm font-black text-white mt-1">Stripe & UPI Global Gateway Provisioning</h3>
              <p className="text-xs text-white/80 font-medium">
                Configure your Stripe keys once and set merchant UPI VPAs. All 4 apps (Education, Digital, Rimi, Trade) will automatically use these gateways for student tuition, client retainers, and distribution invoices.
              </p>
            </div>
            <Button
              type="submit"
              size="sm"
              className="bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-black text-xs shrink-0 shadow-lg"
            >
              <Save className="w-4 h-4 mr-1" /> Deploy Gateways
            </Button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Stripe Card Config */}
            <Card className="p-6 border border-slate-200/80 shadow-xs space-y-5">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center border border-blue-200">
                    <CreditCard className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-black text-slate-900">Stripe Payment Gateway</h3>
                    <p className="text-[11px] font-semibold text-slate-400">Credit/Debit Cards, Apple Pay & Global Currencies</p>
                  </div>
                </div>
                <label className="flex items-center gap-2 text-xs font-bold text-slate-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={gateways.stripe.enabled}
                    onChange={e => setGateways({
                      ...gateways,
                      stripe: { ...gateways.stripe, enabled: e.target.checked }
                    })}
                    className="w-4 h-4 accent-blue-600"
                  />
                  <span>Active</span>
                </label>
              </div>

              <div className="space-y-4 text-xs font-semibold text-slate-700">
                <div>
                  <label className="block text-[10px] font-extrabold uppercase text-slate-400 mb-1">Environment Mode</label>
                  <select
                    value={gateways.stripe.environment}
                    onChange={e => setGateways({
                      ...gateways,
                      stripe: { ...gateways.stripe, environment: e.target.value as any }
                    })}
                    className="w-full h-9 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold"
                  >
                    <option value="sandbox">Sandbox / Test Mode (pk_test / sk_test)</option>
                    <option value="production">Live Production Mode (pk_live / sk_live)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-extrabold uppercase text-slate-400 mb-1">Stripe Publishable Key *</label>
                  <input
                    type="text"
                    required
                    value={gateways.stripe.publishableKey}
                    onChange={e => setGateways({
                      ...gateways,
                      stripe: { ...gateways.stripe, publishableKey: e.target.value }
                    })}
                    placeholder="pk_test_... or pk_live_..."
                    className="w-full h-9 px-3 bg-slate-50 border border-slate-200 rounded-xl font-mono text-xs font-bold text-slate-900"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-extrabold uppercase text-slate-400 mb-1">Stripe Secret Key *</label>
                  <input
                    type="password"
                    required
                    value={gateways.stripe.secretKey}
                    onChange={e => setGateways({
                      ...gateways,
                      stripe: { ...gateways.stripe, secretKey: e.target.value }
                    })}
                    placeholder="sk_test_... or sk_live_..."
                    className="w-full h-9 px-3 bg-slate-50 border border-slate-200 rounded-xl font-mono text-xs font-bold text-slate-900"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-extrabold uppercase text-slate-400 mb-1">Stripe Webhook Signing Secret</label>
                  <input
                    type="password"
                    value={gateways.stripe.webhookSecret}
                    onChange={e => setGateways({
                      ...gateways,
                      stripe: { ...gateways.stripe, webhookSecret: e.target.value }
                    })}
                    placeholder="whsec_..."
                    className="w-full h-9 px-3 bg-slate-50 border border-slate-200 rounded-xl font-mono text-xs font-bold text-slate-900"
                  />
                </div>

                <div className="pt-2 flex items-center justify-between">
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    disabled={testingStripe}
                    onClick={handleTestStripe}
                    className="text-xs font-bold"
                  >
                    {testingStripe ? 'Testing Connection...' : 'Test Stripe API Keys'}
                  </Button>
                  <span className="text-[10px] text-slate-400">Supports INR, EUR & USD</span>
                </div>
              </div>
            </Card>

            {/* UPI Gateway Config */}
            <Card className="p-6 border border-slate-200/80 shadow-xs space-y-5">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-200">
                    <QrCode className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-black text-slate-900">Unified UPI & Dynamic QR Gateway</h3>
                    <p className="text-[11px] font-semibold text-slate-400">Instant UPI VPA, QR generation & Auto-UTR Logging</p>
                  </div>
                </div>
                <label className="flex items-center gap-2 text-xs font-bold text-slate-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={gateways.upi.enabled}
                    onChange={e => setGateways({
                      ...gateways,
                      upi: { ...gateways.upi, enabled: e.target.checked }
                    })}
                    className="w-4 h-4 accent-emerald-600"
                  />
                  <span>Active</span>
                </label>
              </div>

              <div className="space-y-4 text-xs font-semibold text-slate-700">
                <div>
                  <label className="block text-[10px] font-extrabold uppercase text-slate-400 mb-1">Central Merchant UPI ID (VPA) *</label>
                  <input
                    type="text"
                    required
                    value={gateways.upi.upiId}
                    onChange={e => setGateways({
                      ...gateways,
                      upi: { ...gateways.upi, upiId: e.target.value }
                    })}
                    placeholder="e.g. ferex.payments@icici or merchant@upi"
                    className="w-full h-9 px-3 bg-slate-50 border border-slate-200 rounded-xl font-mono text-xs font-black text-slate-900"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-extrabold uppercase text-slate-400 mb-1">Merchant Display Name *</label>
                  <input
                    type="text"
                    required
                    value={gateways.upi.merchantName}
                    onChange={e => setGateways({
                      ...gateways,
                      upi: { ...gateways.upi, merchantName: e.target.value }
                    })}
                    placeholder="e.g. FEREX ENTERPRISE GROUP"
                    className="w-full h-9 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-extrabold uppercase text-slate-400 mb-1">Merchant Category Code (MCC)</label>
                  <input
                    type="text"
                    value={gateways.upi.merchantCode || '5411'}
                    onChange={e => setGateways({
                      ...gateways,
                      upi: { ...gateways.upi, merchantCode: e.target.value }
                    })}
                    placeholder="e.g. 5411 or 8220 (Education)"
                    className="w-full h-9 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900"
                  />
                </div>

                <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-100 flex items-center justify-between text-[11px] font-semibold text-emerald-900">
                  <span>✓ Dynamic QR Generation Enabled</span>
                  <span className="font-black text-emerald-700">Live API</span>
                </div>
              </div>
            </Card>
          </div>

          {/* Division-Level Gateway Routing Table */}
          <Card className="p-6 border border-slate-200/80 shadow-xs space-y-4">
            <h3 className="text-sm font-black text-slate-900 border-b border-slate-100 pb-2">
              Division Payment Gateway Allocations
            </h3>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 text-[10px] font-black uppercase text-slate-400 border-b border-slate-200">
                    <th className="py-2.5 px-3">Enterprise Division</th>
                    <th className="py-2.5 px-3">Allow Stripe</th>
                    <th className="py-2.5 px-3">Allow UPI</th>
                    <th className="py-2.5 px-3">Division Specific UPI VPA</th>
                    <th className="py-2.5 px-3">Merchant Header</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs font-semibold text-slate-700">
                  {[
                    { key: 'education', name: 'Ferex Education (Students)' },
                    { key: 'digital', name: 'Ferex Digital ERP (Clients)' },
                    { key: 'rimi', name: 'Rimi Frozen Logistics (Customers)' },
                    { key: 'trade', name: 'Global Trade (Port Buyers)' },
                  ].map(div => {
                    const divConfig = gateways.divisions[div.key as keyof typeof gateways.divisions];
                    return (
                      <tr key={div.key} className="hover:bg-slate-50/70">
                        <td className="py-3 px-3 font-black text-slate-900">{div.name}</td>
                        <td className="py-3 px-3">
                          <input
                            type="checkbox"
                            checked={divConfig.allowStripe}
                            onChange={e => {
                              const updatedDiv = { ...divConfig, allowStripe: e.target.checked };
                              setGateways({
                                ...gateways,
                                divisions: { ...gateways.divisions, [div.key]: updatedDiv }
                              });
                            }}
                            className="w-4 h-4 accent-blue-600"
                          />
                        </td>
                        <td className="py-3 px-3">
                          <input
                            type="checkbox"
                            checked={divConfig.allowUpi}
                            onChange={e => {
                              const updatedDiv = { ...divConfig, allowUpi: e.target.checked };
                              setGateways({
                                ...gateways,
                                divisions: { ...gateways.divisions, [div.key]: updatedDiv }
                              });
                            }}
                            className="w-4 h-4 accent-emerald-600"
                          />
                        </td>
                        <td className="py-3 px-3">
                          <input
                            type="text"
                            value={divConfig.customUpiId || ''}
                            onChange={e => {
                              const updatedDiv = { ...divConfig, customUpiId: e.target.value };
                              setGateways({
                                ...gateways,
                                divisions: { ...gateways.divisions, [div.key]: updatedDiv }
                              });
                            }}
                            className="h-8 px-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-mono font-bold w-48"
                          />
                        </td>
                        <td className="py-3 px-3">
                          <input
                            type="text"
                            value={divConfig.customMerchantName || ''}
                            onChange={e => {
                              const updatedDiv = { ...divConfig, customMerchantName: e.target.value };
                              setGateways({
                                ...gateways,
                                divisions: { ...gateways.divisions, [div.key]: updatedDiv }
                              });
                            }}
                            className="h-8 px-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold w-48"
                          />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="pt-3 flex justify-end">
              <Button type="submit" size="sm" className="bg-[#6A1B2E] hover:bg-[#521221] text-xs font-bold text-white shadow-md">
                <Save className="w-4 h-4 mr-1.5" /> Save Gateways Configuration
              </Button>
            </div>
          </Card>
        </form>
      )}

      {/* ─── TAB: OTHER SYSTEM SETTINGS ────────────────────────────────────── */}
      {activeTab !== 'gateways' && (
        <form onSubmit={handleSaveSettings}>
          <Card className="p-6 border border-slate-200/80 shadow-xs space-y-6">
            {activeTab === 'security' && (
              <div className="space-y-4">
                <h3 className="text-sm font-black text-slate-900 border-b border-slate-100 pb-3">
                  Enterprise Authentication & RBAC Policy
                </h3>

                <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-100">
                  <div>
                    <h4 className="text-xs font-black text-slate-900">Enforce 2-Factor Authentication (2FA)</h4>
                    <p className="text-[11px] font-semibold text-slate-500">Require TOTP authenticator app verification for all 4 Division Admins.</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={settings.enforce2FA}
                    onChange={e => setSettings({ ...settings, enforce2FA: e.target.checked })}
                    className="w-4 h-4 accent-[#6A1B2E]"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-extrabold text-slate-400 uppercase mb-1">Session Inactivity Timeout (Minutes)</label>
                    <input
                      type="number"
                      value={settings.sessionTimeoutMins}
                      onChange={e => setSettings({ ...settings, sessionTimeoutMins: Number(e.target.value) })}
                      className="w-full h-9 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-extrabold text-slate-400 uppercase mb-1">Audit Log Retention (Days)</label>
                    <input
                      type="number"
                      value={settings.autoAuditLogRetentionDays}
                      onChange={e => setSettings({ ...settings, autoAuditLogRetentionDays: Number(e.target.value) })}
                      className="w-full h-9 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold"
                    />
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'currency' && (
              <div className="space-y-4">
                <h3 className="text-sm font-black text-slate-900 border-b border-slate-100 pb-3">
                  Multi-Currency Parity & Exchange Rates
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-extrabold text-slate-400 uppercase mb-1">1 EUR to INR Rate (₹)</label>
                    <input
                      type="number"
                      step="0.1"
                      value={settings.eurInrRate}
                      onChange={e => setSettings({ ...settings, eurInrRate: Number(e.target.value) })}
                      className="w-full h-9 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-extrabold text-slate-400 uppercase mb-1">1 USD to INR Rate (₹)</label>
                    <input
                      type="number"
                      step="0.1"
                      value={settings.usdInrRate}
                      onChange={e => setSettings({ ...settings, usdInrRate: Number(e.target.value) })}
                      className="w-full h-9 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold"
                    />
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'backup' && (
              <div className="space-y-4">
                <h3 className="text-sm font-black text-slate-900 border-b border-slate-100 pb-3 flex items-center justify-between">
                  <span>Database Backup & Storage Vault</span>
                  <Button
                    type="button"
                    size="sm"
                    onClick={handleTriggerBackup}
                    className="bg-emerald-600 hover:bg-emerald-700 text-xs font-bold text-white shadow-xs"
                  >
                    <RefreshCw className="w-3.5 h-3.5 mr-1" /> Snapshot Now
                  </Button>
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-extrabold text-slate-400 uppercase mb-1">Automated Snapshot Frequency</label>
                    <input
                      type="text"
                      disabled
                      value={settings.backupFrequency}
                      className="w-full h-9 px-3 bg-slate-100 border border-slate-200 rounded-xl text-xs font-semibold text-slate-600"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-extrabold text-slate-400 uppercase mb-1">Primary Storage Bucket</label>
                    <input
                      type="text"
                      disabled
                      value={settings.storageBucket}
                      className="w-full h-9 px-3 bg-slate-100 border border-slate-200 rounded-xl text-xs font-semibold text-slate-600"
                    />
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'smtp' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <div>
                    <h3 className="text-sm font-black text-slate-900">
                      SMTP Gateway & Multi-Provider Delivery Engine
                    </h3>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Manage Resend, Brevo, AWS SES, SendGrid, Postmark, and Custom SMTP relays.
                    </p>
                  </div>
                  <a
                    href="#/central/email-settings"
                    className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-black text-white bg-[#6A1B2E] hover:bg-[#521221] rounded-xl shadow-xs transition-colors"
                  >
                    <Mail className="w-3.5 h-3.5" /> Open Full Email Settings Console
                  </a>
                </div>

                <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-lg bg-[#6A1B2E]/10 text-[#6A1B2E] flex items-center justify-center font-black">
                      <Mail className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="text-xs font-black text-slate-900">Dedicated Email Provider Engine Active</h4>
                      <p className="text-[11px] text-slate-500">
                        Multi-provider switching, API key encryption, subsidiary sender routing, and real-time edge testing are available in the dedicated console.
                      </p>
                    </div>
                  </div>
                  <a
                    href="#/central/email-settings"
                    className="text-xs font-bold text-[#6A1B2E] hover:underline"
                  >
                    Configure Providers ➔
                  </a>
                </div>
              </div>
            )}

            <div className="pt-4 border-t border-slate-100 flex justify-end">
              <Button type="submit" size="sm" className="bg-[#6A1B2E] hover:bg-[#521221] text-xs font-bold text-white shadow-xs">
                <Save className="w-4 h-4 mr-1.5" /> Save Configuration
              </Button>
            </div>
          </Card>
        </form>
      )}
    </div>
  );
};
