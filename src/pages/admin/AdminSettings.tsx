import React, { useState } from 'react';
import { Save, CheckCircle2, Shield, Bell, Palette, Mail, Lock, Building2, Plus, DollarSign } from 'lucide-react';
import { AdminFeeConfig } from './AdminFeeConfig';

const TABS = ['Organization', 'Fee & Intake Config', 'Email Templates', 'Notifications', 'Roles & Permissions', 'Security', 'Appearance'];

const TAB_ICONS: Record<string, any> = {
  Organization: <Building2 className="w-4 h-4" />,
  'Fee & Intake Config': <DollarSign className="w-4 h-4 text-emerald-600" />,
  'Email Templates': <Mail className="w-4 h-4" />,
  Notifications: <Bell className="w-4 h-4" />,
  'Roles & Permissions': <Shield className="w-4 h-4" />,
  Security: <Lock className="w-4 h-4" />,
  Appearance: <Palette className="w-4 h-4" />,
};

const INITIAL_ORG = { name: 'Ferex Education', tagline: 'Your Gateway to European Education', email: 'admin@ferex.com', phone: '+91 80001 22334', website: 'www.ferex.com', address: 'Bangalore, Karnataka, India', timezone: 'IST (UTC+5:30)', language: 'English' };

const EMAIL_TEMPLATES = [
  { id: 1, name: 'Welcome Email', trigger: 'New Student Enrolled', status: 'Active' },
  { id: 2, name: 'Application Confirmation', trigger: 'Application Submitted', status: 'Active' },
  { id: 3, name: 'Offer Letter Issued', trigger: 'Offer Approved', status: 'Active' },
  { id: 4, name: 'Document Rejected', trigger: 'Document Status: Rejected', status: 'Active' },
  { id: 5, name: 'Payment Received', trigger: 'Payment Confirmed', status: 'Inactive' },
  { id: 6, name: 'Visa Appointment Reminder', trigger: '3 Days Before Appointment', status: 'Active' },
];

const ROLES = [
  { name: 'Super Admin', count: 1, permissions: 12 },
  { name: 'Application Manager', count: 2, permissions: 8 },
  { name: 'Senior Counselor', count: 3, permissions: 6 },
  { name: 'Document Verifier', count: 2, permissions: 4 },
  { name: 'Finance Coordinator', count: 1, permissions: 4 },
];

export const AdminSettings: React.FC = () => {
  const [activeTab, setActiveTab] = useState('Organization');
  const [org, setOrg] = useState(INITIAL_ORG);
  const [toast, setToast] = useState('');
  const [twoFA, setTwoFA] = useState(true);
  const [sessionTimeout, setSessionTimeout] = useState('30');
  const [notifPrefs, setNotifPrefs] = useState({
    newStudent: true, appUpdate: true, docReview: true, payment: false, support: true, staffLeave: false,
  });
  const [theme, setTheme] = useState('Light');
  const [accentColor, setAccentColor] = useState('#6A1B2E');

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(''), 2500); };

  const renderOrg = () => (
    <div className="space-y-5">
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
            <label className="block text-[10px] font-extrabold text-slate-400 uppercase tracking-wider mb-1.5">{label}</label>
            <input value={org[key]} onChange={(e) => setOrg({ ...org, [key]: e.target.value })}
              className="w-full h-10 px-3.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-900 focus:outline-none focus:border-[#6A1B2E]/50 transition-all" />
          </div>
        ))}
        <div>
          <label className="block text-[10px] font-extrabold text-slate-400 uppercase tracking-wider mb-1.5">Timezone</label>
          <select value={org.timezone} onChange={(e) => setOrg({ ...org, timezone: e.target.value })}
            className="w-full h-10 px-3.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-900 focus:outline-none focus:border-[#6A1B2E]/50">
            <option>IST (UTC+5:30)</option><option>UTC</option><option>GST (UTC+4)</option><option>CET (UTC+1)</option>
          </select>
        </div>
        <div>
          <label className="block text-[10px] font-extrabold text-slate-400 uppercase tracking-wider mb-1.5">Language</label>
          <select value={org.language} onChange={(e) => setOrg({ ...org, language: e.target.value })}
            className="w-full h-10 px-3.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-900 focus:outline-none focus:border-[#6A1B2E]/50">
            <option>English</option><option>Arabic</option><option>Hindi</option>
          </select>
        </div>
      </div>
      <button onClick={() => showToast('Organization settings saved!')}
        className="flex items-center gap-1.5 h-10 px-5 bg-[#6A1B2E] text-white text-xs font-bold rounded-xl hover:bg-[#4A101E] transition-all shadow-sm">
        <Save className="w-4 h-4" /> Save Settings
      </button>
    </div>
  );

  const renderEmailTemplates = () => (
    <div className="space-y-3">
      {EMAIL_TEMPLATES.map((t) => (
        <div key={t.id} className="flex items-center gap-4 p-4 bg-white border border-slate-100 rounded-xl shadow-sm">
          <Mail className="w-5 h-5 text-[#6A1B2E]/60 shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-xs font-extrabold text-slate-900">{t.name}</p>
            <p className="text-[10px] font-semibold text-slate-400">Trigger: {t.trigger}</p>
          </div>
          <span className={`shrink-0 px-2 py-0.5 rounded-full text-[10px] font-bold border ${t.status === 'Active' ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : 'bg-slate-50 text-slate-500 border-slate-200'}`}>{t.status}</span>
          <button onClick={() => showToast(`Opened template editor for "${t.name}"`)}
            className="shrink-0 text-[10px] font-bold text-[#6A1B2E] hover:underline">Edit</button>
        </div>
      ))}
      <button onClick={() => showToast('New template editor opened.')}
        className="w-full flex items-center justify-center gap-2 h-10 border-2 border-dashed border-slate-200 text-xs font-bold text-slate-400 rounded-xl hover:border-[#6A1B2E]/30 hover:text-[#6A1B2E] transition-all">
        <Plus className="w-4 h-4" /> Add New Template
      </button>
    </div>
  );

  const renderNotifications = () => (
    <div className="space-y-3 max-w-lg">
      <p className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">Admin Notification Preferences</p>
      {Object.entries({
        newStudent: 'New Student Enrollment',
        appUpdate: 'Application Status Update',
        docReview: 'Document Review Required',
        payment: 'Payment Received',
        support: 'New Support Ticket',
        staffLeave: 'Staff Leave Request',
      }).map(([key, label]) => (
        <div key={key} className="flex items-center justify-between p-3.5 bg-white border border-slate-100 rounded-xl">
          <p className="text-xs font-bold text-slate-700">{label}</p>
          <button onClick={() => setNotifPrefs(prev => ({ ...prev, [key]: !prev[key as keyof typeof prev] }))}
            className={`w-10 h-5.5 rounded-full transition-all relative flex items-center px-0.5 ${notifPrefs[key as keyof typeof notifPrefs] ? 'bg-[#6A1B2E]' : 'bg-slate-200'}`}>
            <span className={`w-4 h-4 bg-white rounded-full shadow-sm transition-transform ${notifPrefs[key as keyof typeof notifPrefs] ? 'translate-x-4' : 'translate-x-0'}`} />
          </button>
        </div>
      ))}
      <button onClick={() => showToast('Notification preferences saved!')}
        className="flex items-center gap-1.5 h-9 px-4 bg-[#6A1B2E] text-white text-xs font-bold rounded-xl hover:bg-[#4A101E] transition-all mt-3">
        <Save className="w-3.5 h-3.5" /> Save Preferences
      </button>
    </div>
  );

  const renderRoles = () => (
    <div className="space-y-3">
      {ROLES.map((r) => (
        <div key={r.name} className="flex items-center gap-4 p-4 bg-white border border-slate-100 rounded-xl shadow-sm">
          <div className="w-9 h-9 rounded-xl bg-[#6A1B2E]/10 flex items-center justify-center shrink-0"><Shield className="w-4.5 h-4.5 text-[#6A1B2E]" /></div>
          <div className="flex-1">
            <p className="text-xs font-extrabold text-slate-900">{r.name}</p>
            <p className="text-[10px] font-semibold text-slate-400">{r.count} member{r.count > 1 ? 's' : ''} · {r.permissions} permissions</p>
          </div>
          <button onClick={() => showToast(`Opened permissions editor for "${r.name}"`)}
            className="text-[10px] font-bold text-[#6A1B2E] hover:underline">Edit</button>
        </div>
      ))}
      <button onClick={() => showToast('New role creation form opened.')}
        className="w-full flex items-center justify-center gap-2 h-10 border-2 border-dashed border-slate-200 text-xs font-bold text-slate-400 rounded-xl hover:border-[#6A1B2E]/30 hover:text-[#6A1B2E] transition-all">
        <Plus className="w-4 h-4" /> Add New Role
      </button>
    </div>
  );

  const renderSecurity = () => (
    <div className="space-y-4 max-w-lg">
      <div className="p-4 bg-white border border-slate-100 rounded-xl shadow-sm flex items-center justify-between">
        <div>
          <p className="text-xs font-extrabold text-slate-900">Two-Factor Authentication</p>
          <p className="text-[10px] font-semibold text-slate-400 mt-0.5">Require 2FA for all admin logins</p>
        </div>
        <button onClick={() => { setTwoFA(!twoFA); showToast(`2FA ${!twoFA ? 'enabled' : 'disabled'}.`); }}
          className={`w-10 h-5 rounded-full transition-all relative flex items-center px-0.5 ${twoFA ? 'bg-[#6A1B2E]' : 'bg-slate-200'}`}>
          <span className={`w-4 h-4 bg-white rounded-full shadow-sm transition-transform ${twoFA ? 'translate-x-5' : 'translate-x-0'}`} />
        </button>
      </div>
      <div className="p-4 bg-white border border-slate-100 rounded-xl shadow-sm">
        <p className="text-xs font-extrabold text-slate-900 mb-2">Session Timeout</p>
        <select value={sessionTimeout} onChange={(e) => setSessionTimeout(e.target.value)}
          className="h-10 px-3.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-900 focus:outline-none focus:border-[#6A1B2E]/50 w-full">
          <option value="15">15 minutes</option><option value="30">30 minutes</option><option value="60">1 hour</option><option value="120">2 hours</option>
        </select>
      </div>
      <button onClick={() => showToast('Security settings updated!')}
        className="flex items-center gap-1.5 h-9 px-4 bg-[#6A1B2E] text-white text-xs font-bold rounded-xl hover:bg-[#4A101E] transition-all">
        <Lock className="w-3.5 h-3.5" /> Save Security Settings
      </button>
    </div>
  );

  const renderAppearance = () => (
    <div className="space-y-4 max-w-lg">
      <div>
        <label className="block text-[10px] font-extrabold text-slate-400 uppercase tracking-wider mb-2">Theme</label>
        <div className="flex gap-2">
          {['Light', 'Dark', 'Auto'].map(t => (
            <button key={t} onClick={() => setTheme(t)}
              className={`flex-1 h-10 rounded-xl text-xs font-bold border transition-all ${theme === t ? 'bg-[#6A1B2E] text-white border-[#6A1B2E]' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'}`}>
              {t}
            </button>
          ))}
        </div>
      </div>
      <div>
        <label className="block text-[10px] font-extrabold text-slate-400 uppercase tracking-wider mb-2">Accent Color</label>
        <div className="flex items-center gap-3">
          {['#6A1B2E', '#1E40AF', '#065F46', '#7C3AED', '#B45309'].map(c => (
            <button key={c} onClick={() => setAccentColor(c)}
              className={`w-9 h-9 rounded-xl transition-transform ${accentColor === c ? 'scale-110 ring-2 ring-offset-2 ring-slate-400' : 'hover:scale-105'}`}
              style={{ backgroundColor: c }} />
          ))}
          <input type="color" value={accentColor} onChange={(e) => setAccentColor(e.target.value)}
            className="w-9 h-9 rounded-xl border border-slate-200 cursor-pointer" />
        </div>
      </div>
      <button onClick={() => showToast('Appearance settings saved!')}
        className="flex items-center gap-1.5 h-9 px-4 bg-[#6A1B2E] text-white text-xs font-bold rounded-xl hover:bg-[#4A101E] transition-all">
        <Palette className="w-3.5 h-3.5" /> Save Appearance
      </button>
    </div>
  );

  const renderContent = () => {
    switch (activeTab) {
      case 'Organization': return renderOrg();
      case 'Fee & Intake Config': return <AdminFeeConfig />;
      case 'Email Templates': return renderEmailTemplates();
      case 'Notifications': return renderNotifications();
      case 'Roles & Permissions': return renderRoles();
      case 'Security': return renderSecurity();
      case 'Appearance': return renderAppearance();
      default: return null;
    }
  };

  return (
    <div className="space-y-5 relative">
      {toast && (
        <div className="fixed top-6 right-6 z-50 bg-slate-900 text-white px-5 py-3.5 rounded-xl shadow-2xl text-sm font-bold flex items-center gap-3">
          <CheckCircle2 className="w-5 h-5 text-emerald-400" /> {toast}
        </div>
      )}

      <div>
        <h1 className="text-xl font-extrabold text-slate-900">Settings</h1>
        <p className="text-xs font-semibold text-slate-400 mt-0.5">Manage your Ferex Admin platform settings</p>
      </div>

      <div className="flex gap-5 items-start">
        {/* Tab nav */}
        <div className="w-48 shrink-0 space-y-0.5">
          {TABS.map((tab) => (
            <button key={tab} onClick={() => setActiveTab(tab)}
              className={`w-full flex items-center gap-2.5 h-9 px-3 rounded-xl text-xs font-bold transition-all
                ${activeTab === tab ? 'bg-[#6A1B2E] text-white shadow-sm' : 'text-slate-500 hover:text-slate-900 hover:bg-slate-50'}`}>
              {TAB_ICONS[tab]}
              <span className="truncate">{tab}</span>
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 bg-white border border-slate-100 rounded-2xl p-6 shadow-sm min-h-[400px]">
          <h3 className="text-sm font-extrabold text-slate-900 mb-5">{activeTab}</h3>
          {renderContent()}
        </div>
      </div>
    </div>
  );
};
