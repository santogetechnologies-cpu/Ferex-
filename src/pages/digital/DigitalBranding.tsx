import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Award, CheckCircle2, Download, Copy, Check,
  Package, CreditCard, Shirt, Tv, Sparkles
} from 'lucide-react';
import { Card } from '../../components/Card';
import { Button } from '../../components/Button';
import { getDigitalClients, getDigitalProjects } from '../../lib/api/digital';
import { supabase } from '../../lib/supabase';

export const DigitalBranding: React.FC = () => {
  const [toast, setToast] = useState('');
  const [copiedHex, setCopiedHex] = useState('');
  const [clients, setClients] = useState<any[]>([]);
  const [selectedClient, setSelectedClient] = useState<any | null>(null);
  const [selectedMockup, setSelectedMockup] = useState<'business-card' | 'packaging' | 'merch' | 'billboard'>('business-card');

  const [colorSwatches] = useState([
    { name: 'Deep Maroon', hex: '#6A1B2E', role: 'Primary Brand' },
    { name: 'Crimson Rose', hex: '#9B3A50', role: 'Secondary Accent' },
    { name: 'Emerald Velvet', hex: '#10B981', role: 'Success Token' },
    { name: 'Slate Onyx', hex: '#0F172A', role: 'Typography Dark' },
  ]);

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(''), 3000); };

  const loadData = useCallback(async () => {
    try {
      const [cData] = await Promise.all([
        getDigitalClients(),
        getDigitalProjects()
      ]);
      setClients(cData || []);
      if (cData && cData.length > 0 && !selectedClient) {
        setSelectedClient(cData[0]);
      }
    } catch {}
  }, [selectedClient]);

  useEffect(() => {
    loadData();

    const channel = supabase
      .channel('realtime_digital_branding')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'digital_clients' }, () => loadData())
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [loadData]);

  const copyToClipboard = (hex: string) => {
    navigator.clipboard.writeText(hex);
    setCopiedHex(hex);
    showToast(`Copied color code ${hex} to clipboard!`);
    setTimeout(() => setCopiedHex(''), 2000);
  };

  const clientName = selectedClient?.company_name || 'FEREX DIGITAL';
  const clientContact = selectedClient?.contact_person || 'Executive Lead';
  const clientEmail = selectedClient?.email || 'contact@client.com';
  const clientPhone = selectedClient?.phone || '+91 98765 43210';

  return (
    <div className="space-y-6 text-left antialiased select-none">
      {/* Toast Notification */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed top-20 right-8 z-50 bg-[#6A1B2E] text-white text-xs font-bold px-4 py-2.5 rounded-xl shadow-xl flex items-center gap-2 border border-white/20"
          >
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            {toast}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-black text-slate-900 flex items-center gap-2">
            <Award className="w-5 h-5 text-[#6A1B2E]" /> Creative Brand Studio & Mockup Showcase
          </h1>
          <p className="text-xs font-semibold text-slate-500 mt-1">
            Dynamic brand mockup generator (Business card, Packaging, Apparel, Billboard), tokenized palette system, and identity assets.
          </p>
        </div>
        <Button size="sm" className="bg-[#6A1B2E] hover:bg-[#521221] text-xs font-bold" onClick={() => showToast(`Brand manual compiled for ${clientName}!`)}>
          <Download className="w-4 h-4 mr-1.5" /> Download Brand Manual (PDF)
        </Button>
      </div>

      {/* Client Brand Target Bar */}
      <Card className="p-4 border border-slate-200/70 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <Sparkles className="w-4 h-4 text-[#6A1B2E]" />
          <span className="text-xs font-bold text-slate-700">Brand Identity Client:</span>
          <select
            value={selectedClient?.id || ''}
            onChange={(e) => setSelectedClient(clients.find(c => c.id === e.target.value) || null)}
            className="h-8 px-3 bg-slate-100 border border-slate-200 rounded-lg text-xs font-bold text-slate-900"
          >
            {clients.map(c => (
              <option key={c.id} value={c.id}>{c.company_name} ({c.contact_person})</option>
            ))}
          </select>
        </div>
        <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200">
          ✓ Vector Assets & Tokens Synchronized
        </span>
      </Card>

      {/* SIGNATURE VISUAL FEATURE 1: Interactive Brand Mockup Showcase Gallery */}
      <Card className="p-6 border border-slate-300 rounded-3xl shadow-xl space-y-6 bg-white">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
          <div>
            <span className="text-[10px] font-black uppercase text-[#6A1B2E]">Realistic Brand Asset Mockups</span>
            <h3 className="text-lg font-black text-slate-900">Interactive Collateral Showcase</h3>
          </div>
          <div className="flex flex-wrap gap-2 text-xs font-bold">
            {[
              { id: 'business-card', label: 'Business Card', icon: CreditCard },
              { id: 'packaging', label: 'Packaging Box', icon: Package },
              { id: 'merch', label: 'Apparel & Merch', icon: Shirt },
              { id: 'billboard', label: 'Outdoor Billboard', icon: Tv },
            ].map(tab => {
              const IconComp = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setSelectedMockup(tab.id as any)}
                  className={`px-3 py-1.5 rounded-xl transition-all flex items-center gap-1.5 ${selectedMockup === tab.id ? 'bg-[#6A1B2E] text-white shadow-md' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'}`}
                >
                  <IconComp className="w-3.5 h-3.5" /> {tab.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Dynamic Mockup Preview Frame */}
        <div className="p-8 rounded-3xl bg-slate-900 text-white min-h-[320px] flex items-center justify-center text-center relative overflow-hidden">
          {selectedMockup === 'business-card' && (
            <div className="w-96 h-56 rounded-2xl bg-gradient-to-br from-[#6A1B2E] via-[#521221] to-[#0F172A] p-6 text-white shadow-2xl border border-white/20 flex flex-col justify-between text-left space-y-4">
              <div className="flex justify-between items-start">
                <span className="text-2xl font-black text-white uppercase">{clientName}</span>
                <span className="text-[9px] font-black uppercase bg-white/20 px-2 py-0.5 rounded text-emerald-300">Embossed Gold Foil</span>
              </div>
              <div className="space-y-1">
                <h4 className="text-base font-black text-white">{clientContact}</h4>
                <p className="text-xs text-white/80 font-bold">Director & Executive Lead</p>
                <p className="text-[10px] text-white/60 font-mono">{clientEmail} • {clientPhone}</p>
              </div>
            </div>
          )}

          {selectedMockup === 'packaging' && (
            <div className="w-80 h-64 rounded-3xl bg-gradient-to-br from-amber-700 via-amber-900 to-slate-900 p-6 text-white shadow-2xl border-4 border-amber-600/30 flex flex-col justify-between text-left">
              <span className="text-xs font-black uppercase text-amber-300">Custom Rigid Gift Box</span>
              <div className="space-y-1">
                <h4 className="text-xl font-black text-white uppercase">{clientName}</h4>
                <p className="text-xs font-semibold text-amber-200">Premium Export Packaging • Matte Laminated Finish</p>
              </div>
              <span className="text-[10px] font-mono text-amber-400">SKU #FRX-BOX-{Math.floor(100 + Math.random() * 800)}</span>
            </div>
          )}

          {selectedMockup === 'merch' && (
            <div className="w-80 h-64 rounded-3xl bg-slate-800 border-2 border-slate-700 p-6 text-white shadow-2xl flex flex-col items-center justify-center space-y-3">
              <Shirt className="w-16 h-16 text-[#6A1B2E]" />
              <h4 className="text-base font-black text-white uppercase">{clientName} MERCH</h4>
              <span className="text-xs font-bold text-slate-400">100% Organic Heavyweight Cotton • Screen Printed</span>
            </div>
          )}

          {selectedMockup === 'billboard' && (
            <div className="w-full max-w-xl h-56 rounded-2xl bg-gradient-to-r from-blue-900 via-[#6A1B2E] to-purple-900 p-6 text-white shadow-2xl flex flex-col justify-between text-left border-4 border-slate-800">
              <span className="text-[10px] font-black uppercase text-amber-400">12x24ft LED Highway Billboard</span>
              <div>
                <h4 className="text-2xl font-black text-white uppercase">{clientName}</h4>
                <p className="text-xs font-bold text-slate-200">Next-Gen Web, Mobile & Enterprise Cloud Software Solutions</p>
              </div>
              <span className="text-[10px] font-mono text-slate-300">www.{clientName.toLowerCase().replace(/[^a-z0-9]/g, '')}.com</span>
            </div>
          )}
        </div>
      </Card>

      {/* SIGNATURE VISUAL FEATURE 2: Live Color Swatch Generator & Copy Tool */}
      <Card className="p-6 border border-slate-200/80 shadow-xs space-y-4">
        <h3 className="text-sm font-black text-slate-900 border-b border-slate-100 pb-2">Tokenized Color Swatches (Click to Copy Hex)</h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {colorSwatches.map(c => (
            <div
              key={c.hex}
              onClick={() => copyToClipboard(c.hex)}
              className="p-4 rounded-2xl border border-slate-200 shadow-2xs hover:shadow-lg transition-all cursor-pointer space-y-3 group bg-white"
            >
              <div className="h-16 rounded-xl border border-slate-200 shadow-inner flex items-center justify-center transition-transform group-hover:scale-105" style={{ backgroundColor: c.hex }}>
                {copiedHex === c.hex ? <Check className="w-6 h-6 text-white drop-shadow" /> : <Copy className="w-5 h-5 text-white/80 opacity-0 group-hover:opacity-100 transition-opacity drop-shadow" />}
              </div>
              <div>
                <span className="text-xs font-black text-slate-900 block">{c.name}</span>
                <span className="text-xs font-mono font-bold text-[#6A1B2E] block">{c.hex}</span>
                <span className="text-[9.5px] font-bold text-slate-400 block mt-0.5">{c.role}</span>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
};
