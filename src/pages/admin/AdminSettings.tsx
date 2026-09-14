import React, { useState } from 'react';
import { Save, CheckCircle2, Bell, Mail, Building2, Plus, DollarSign, Sparkles } from 'lucide-react';
import { AdminFeeConfig } from './AdminFeeConfig';
import { AdminCustomizationPolicies } from './AdminCustomizationPolicies';

const TABS = ['Customization & Policies', 'Fee & Intake Config', 'Organization', 'Email Templates', 'Notifications'];

const TAB_ICONS: Record<string, any> = {
  'Customization & Policies': <Sparkles className="w-4 h-4 text-amber-500" />,
  'Fee & Intake Config': <DollarSign className="w-4 h-4 text-emerald-600" />,
  Organization: <Building2 className="w-4 h-4 text-blue-600" />,
  'Email Templates': <Mail className="w-4 h-4 text-purple-600" />,
  Notifications: <Bell className="w-4 h-4 text-rose-600" />,
};

const INITIAL_ORG = { 
  name: 'Ferex Education', 
  tagline: 'Your Gateway to European Education', 
  email: 'admin@ferex.com', 
  phone: '+91 80001 22334', 
  website: 'www.ferex.com', 
  address: 'Bangalore, Karnataka, India', 
  timezone: 'IST (UTC+5:30)', 
  language: 'English' 
};

const EMAIL_TEMPLATES = [
  { id: 1, name: 'Welcome Email', trigger: 'New Student Enrolled', status: 'Active' },
  { id: 2, name: 'Application Confirmation', trigger: 'Application Submitted', status: 'Active' },
  { id: 3, name: 'Offer Letter Issued', trigger: 'Offer Approved', status: 'Active' },
  { id: 4, name: 'Document Rejected', trigger: 'Document Status: Rejected', status: 'Active' },
  { id: 5, name: 'Payment Received', trigger: 'Payment Confirmed', status: 'Inactive' },
  { id: 6, name: 'Visa Appointment Reminder', trigger: '3 Days Before Appointment', status: 'Active' },
];

export const AdminSettings: React.FC = () => {
  const [activeTab, setActiveTab] = useState('Customization & Policies');
  const [org, setOrg] = useState(INITIAL_ORG);
  const [toast, setToast] = useState('');
  const [notifPrefs, setNotifPrefs] = useState({
    newStudent: true, 
    appUpdate: true, 
    docReview: true, 
    payment: true, 
    support: true, 
    staffLeave: false,
  });

  const showToast = (msg: string) => { 
    setToast(msg); 
    setTimeout(() => setToast(''), 3000); 
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

  const renderEmailTemplates = () => (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {EMAIL_TEMPLATES.map((t) => (
          <div key={t.id} className="flex items-center gap-3.5 p-4 bg-slate-50/70 border border-slate-200/80 rounded-xl shadow-2xs">
            <div className="w-9 h-9 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center shrink-0 border border-purple-100">
              <Mail className="w-4.5 h-4.5" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-extrabold text-slate-900 truncate">{t.name}</p>
              <p className="text-[10px] font-semibold text-slate-500 truncate">Trigger: {t.trigger}</p>
            </div>
            <span className={`shrink-0 px-2 py-0.5 rounded-full text-[10px] font-bold border ${t.status === 'Active' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-slate-100 text-slate-500 border-slate-200'}`}>
              {t.status}
            </span>
            <button 
              onClick={() => showToast(`Opened template editor for "${t.name}"`)}
              className="shrink-0 text-xs font-bold text-[#58051E] hover:underline cursor-pointer"
            >
              Edit
            </button>
          </div>
        ))}
      </div>
      <button 
        onClick={() => showToast('New template editor opened.')}
        className="w-full flex items-center justify-center gap-2 h-11 border-2 border-dashed border-slate-200 text-xs font-bold text-slate-500 rounded-xl hover:border-[#58051E]/40 hover:text-[#58051E] hover:bg-[#58051E]/5 transition-all cursor-pointer"
      >
        <Plus className="w-4 h-4" /> Add New Template
      </button>
    </div>
  );

  const renderNotifications = () => (
    <div className="space-y-4 max-w-xl">
      <p className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">Admin Notification Preferences</p>
      <div className="space-y-2.5">
        {Object.entries({
          newStudent: 'New Student Enrollment',
          appUpdate: 'Application Status Update',
          docReview: 'Document Review Required',
          payment: 'Payment Received & Verified',
          support: 'New Support Ticket & Inquiries',
          staffLeave: 'Staff Leave Request',
        }).map(([key, label]) => (
          <div key={key} className="flex items-center justify-between p-3.5 bg-slate-50 border border-slate-200/80 rounded-xl">
            <p className="text-xs font-bold text-slate-800">{label}</p>
            <button 
              onClick={() => setNotifPrefs(prev => ({ ...prev, [key]: !prev[key as keyof typeof prev] }))}
              className={`w-11 h-6 rounded-full transition-all relative flex items-center px-0.5 cursor-pointer ${notifPrefs[key as keyof typeof notifPrefs] ? 'bg-[#58051E]' : 'bg-slate-300'}`}
            >
              <span className={`w-5 h-5 bg-white rounded-full shadow-sm transition-transform ${notifPrefs[key as keyof typeof notifPrefs] ? 'translate-x-5' : 'translate-x-0'}`} />
            </button>
          </div>
        ))}
      </div>
      <button 
        onClick={() => showToast('Notification preferences saved!')}
        className="flex items-center gap-2 h-10 px-5 bg-[#58051E] hover:bg-[#430316] text-white text-xs font-bold rounded-xl transition-all shadow-xs cursor-pointer mt-3"
      >
        <Save className="w-4 h-4" /> Save Preferences
      </button>
    </div>
  );

  const renderContent = () => {
    switch (activeTab) {
      case 'Customization & Policies': return <AdminCustomizationPolicies onNotify={showToast} />;
      case 'Fee & Intake Config': return <AdminFeeConfig />;
      case 'Organization': return renderOrg();
      case 'Email Templates': return renderEmailTemplates();
      case 'Notifications': return renderNotifications();
      default: return null;
    }
  };

  return (
    <div className="space-y-5 text-left w-full max-w-full overflow-x-hidden">
      {/* Floating Toast Notification */}
      {toast && (
        <div className="fixed top-6 right-6 z-50 bg-slate-900 text-white px-5 py-3.5 rounded-xl shadow-2xl text-xs font-bold flex items-center gap-3 border border-slate-700 animate-in fade-in duration-200">
          <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" /> 
          <span>{toast}</span>
        </div>
      )}

      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200/80 pb-3">
        <div>
          <h1 className="text-xl font-black text-slate-900 tracking-tight">Platform Settings</h1>
          <p className="text-xs font-medium text-slate-500 mt-0.5">Manage your Ferex Admin platform settings & fee governance</p>
        </div>
      </div>

      {/* Main Layout: Responsive Navigation & Content */}
      <div className="flex flex-col lg:flex-row gap-5 items-start w-full">
        {/* Tab Navigation Sidebar */}
        <div className="w-full lg:w-60 shrink-0 flex lg:flex-col flex-wrap gap-1.5 p-1.5 bg-slate-100/80 rounded-2xl border border-slate-200/80">
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
          <h2 className="text-sm font-black text-slate-900 mb-5 border-b border-slate-100 pb-3">
            {activeTab}
          </h2>
          <div className="w-full min-w-0 overflow-x-visible">
            {renderContent()}
          </div>
        </div>
      </div>
    </div>
  );
};

