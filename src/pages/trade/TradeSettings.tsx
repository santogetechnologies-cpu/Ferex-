import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Settings, CheckCircle2 } from 'lucide-react';
import { Card } from '../../components/Card';
import { Button } from '../../components/Button';

export const TradeSettings: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'org' | 'trade' | 'currency' | 'security'>('org');
  const [toast, setToast] = useState('');
  const [twoFactor, setTwoFactor] = useState(true);

  const showToastMsg = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(''), 3000);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    showToastMsg('Trade Portal configuration settings saved!');
  };

  return (
    <div className="space-y-6 text-left antialiased">
      <AnimatePresence>
        {toast && (
          <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="fixed top-20 right-8 z-50 bg-[#6A1B2E] text-white text-xs font-bold px-4 py-2.5 rounded-xl shadow-xl flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            {toast}
          </motion.div>
        )}
      </AnimatePresence>

      <div>
        <h1 className="text-xl font-black text-slate-900 tracking-tight flex items-center gap-2">
          <Settings className="w-5 h-5 text-[#6A1B2E]" /> Global Trade System Settings
        </h1>
        <p className="text-xs font-semibold text-slate-500 mt-1">
          Configure Incoterms defaults, LC banking rules, base currency (INR ₹), and 2FA compliance.
        </p>
      </div>

      <Card className="p-0 border border-slate-200/70 shadow-xs overflow-hidden">
        <div className="flex border-b border-slate-100 px-4 overflow-x-auto bg-slate-50/50">
          {[
            { key: 'org', label: 'Organization & Hub' },
            { key: 'trade', label: 'Trade & Incoterms' },
            { key: 'currency', label: 'Currency (₹ INR)' },
            { key: 'security', label: 'Security & 2FA' },
          ].map((t) => (
            <button
              key={t.key}
              onClick={() => setActiveTab(t.key as any)}
              className={`py-3.5 px-4 text-xs font-bold border-b-2 transition-all whitespace-nowrap ${
                activeTab === t.key ? 'border-[#6A1B2E] text-[#6A1B2E] bg-white' : 'border-transparent text-slate-500 hover:text-slate-900'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        <div className="p-6">
          {activeTab === 'org' && (
            <form onSubmit={handleSave} className="space-y-4 max-w-xl">
              <div>
                <label className="block text-[10px] font-extrabold uppercase text-slate-400 mb-1">Entity Registered Name</label>
                <input type="text" defaultValue="Ferex Global Trade Corp India / Poland" className="w-full h-9 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold" />
              </div>
              <div>
                <label className="block text-[10px] font-extrabold uppercase text-slate-400 mb-1">Corporate Registration Code</label>
                <input type="text" defaultValue="REG-EU-99201-IN" className="w-full h-9 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold" />
              </div>
              <Button type="submit" size="sm" className="bg-[#6A1B2E] hover:bg-[#521221] text-xs font-bold">Save Settings</Button>
            </form>
          )}

          {activeTab === 'currency' && (
            <div className="space-y-4 max-w-xl text-xs font-semibold">
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-100 flex items-center justify-between">
                <div>
                  <span className="font-extrabold text-slate-900 block">Default Base Currency</span>
                  <span className="text-[10.5px] text-slate-500">Indian Rupee (₹ INR) locked for Ferex Trade Demo</span>
                </div>
                <span className="text-xs font-black text-[#6A1B2E] bg-[#6A1B2E]/10 px-3 py-1 rounded-full border border-[#6A1B2E]/20">₹ INR</span>
              </div>
            </div>
          )}

          {activeTab === 'security' && (
            <div className="space-y-4 max-w-xl text-xs font-semibold">
              <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-100">
                <div>
                  <span className="font-extrabold text-slate-900 block">Mandatory 2FA Authentication</span>
                  <span className="text-[10.5px] text-slate-500">Require hardware token for LC authorization</span>
                </div>
                <input type="checkbox" checked={twoFactor} onChange={(e) => setTwoFactor(e.target.checked)} className="w-4 h-4 text-[#6A1B2E]" />
              </div>
            </div>
          )}
        </div>
      </Card>
    </div>
  );
};
