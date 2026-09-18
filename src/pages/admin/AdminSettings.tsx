import React, { useState } from 'react';
import { Save, CheckCircle2, Building2, Shield, Lock } from 'lucide-react';
import { ChangePasswordForm } from '../../components/ChangePasswordForm';

const TABS = ['Organization', 'Security & Password'];

const TAB_ICONS: Record<string, any> = {
  Organization: <Building2 className="w-4 h-4 text-blue-600" />,
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
          <h1 className="text-xl font-black text-slate-900 tracking-tight">Education Admin Settings</h1>
          <p className="text-xs font-medium text-slate-500 mt-0.5">Manage your organization profile, corporate configurations, and account security credentials</p>
        </div>
      </div>

      {/* Main Layout: Navigation & Content */}
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

