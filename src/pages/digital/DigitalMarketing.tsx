import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Megaphone, CheckCircle2, Heart, MessageCircle, Share2, BarChart3, Plus, X, Sparkles
} from 'lucide-react';
import { Card } from '../../components/Card';
import { Button } from '../../components/Button';
import { getDigitalClients, getDigitalLeads } from '../../lib/api/digital';
import { supabase } from '../../lib/supabase';

export const DigitalMarketing: React.FC = () => {
  const [toast, setToast] = useState('');
  const [clients, setClients] = useState<any[]>([]);
  const [leads, setLeads] = useState<any[]>([]);
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [selectedClient, setSelectedClient] = useState<any | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [, setLoading] = useState(true);

  const [newCampaign, setNewCampaign] = useState({
    name: 'Diwali Festive Omnichannel Blast',
    channel: 'Instagram Reels & Meta',
    headline: 'Exclusive 40% Off on Enterprise Solutions',
    roas: '4.6x',
    monthlyBudget: '₹1,50,000',
    targetAudience: 'CTOs & Tech Founders Pan-India'
  });

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(''), 3000); };

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [pData, cData, lData] = await Promise.all([
        getDigitalProjects(),
        getDigitalClients(),
        getDigitalLeads()
      ]);
      setProjects(pData || []);
      setClients(cData || []);
      setLeads(lData || []);

      if (cData && cData.length > 0 && !selectedClient) {
        setSelectedClient(cData[0]);
      }

      const savedCampaigns = localStorage.getItem('ferex_digital_marketing_campaigns');
      if (savedCampaigns) {
        try {
          setCampaigns(JSON.parse(savedCampaigns));
          return;
        } catch {}
      }

      const initialCampaigns = [
        { id: 'cmp-1', name: 'Social Brand Awareness Reel', channel: 'Instagram Reels Ad', roas: '4.2x ROAS', headline: 'Transform Your Digital Presence with Next-Gen Cloud ERP', likes: '42.8k', comments: '1,240', shares: '3.4k', target: 'Tech Enthusiasts & Founders 22-45' },
        { id: 'cmp-2', name: 'Google Search PPC High Intent', channel: 'Google Search PPC', roas: '5.8% CTR', headline: 'Enterprise Software & Mobile App Development Company', likes: '3.2k Clicks', comments: '₹14.20 CPC', shares: '₹3,50,000 Spend', target: 'High Intent Enterprise Search Queries' },
        { id: 'cmp-3', name: 'LinkedIn B2B Executive Sponsored', channel: 'LinkedIn B2B Ad', roas: '12.1% Conv', headline: 'Download 2026 Enterprise Digital Transformation Blueprint', likes: '1.4k Leads', comments: '98 Demos Booked', shares: 'Pan-India', target: 'VP Engineering & Enterprise CXOs' }
      ];
      setCampaigns(initialCampaigns);
      localStorage.setItem('ferex_digital_marketing_campaigns', JSON.stringify(initialCampaigns));
    } finally {
      setLoading(false);
    }
  }, [selectedClient]);

  useEffect(() => {
    loadData();

    const channel = supabase
      .channel('realtime_digital_marketing')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'digital_clients' }, () => loadData())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'digital_leads' }, () => loadData())
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [loadData]);

  const handleCreateCampaign = (e: React.FormEvent) => {
    e.preventDefault();
    const created = {
      id: `cmp-${Date.now()}`,
      name: newCampaign.name,
      channel: newCampaign.channel,
      roas: `${newCampaign.roas} ROAS`,
      headline: newCampaign.headline,
      likes: '1.2k',
      comments: '120',
      shares: '45',
      target: newCampaign.targetAudience
    };
    const updated = [created, ...campaigns];
    setCampaigns(updated);
    localStorage.setItem('ferex_digital_marketing_campaigns', JSON.stringify(updated));
    setShowCreateModal(false);
    showToast(`Launched campaign: ${newCampaign.name}`);
  };

  const activeClientName = selectedClient?.company_name || 'Enterprise Client';

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
            <Megaphone className="w-5 h-5 text-[#6A1B2E]" /> Marketing Command Center & Social Creative Studio
          </h1>
          <p className="text-xs font-semibold text-slate-500 mt-1">
            Multi-channel Instagram Reels, Google PPC, LinkedIn Sponsored Campaigns, and dynamic ROAS analytics linked to live clients.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button size="sm" variant="outline" className="text-xs font-bold" onClick={() => setShowCreateModal(true)}>
            <Plus className="w-4 h-4 mr-1.5" /> Launch Campaign
          </Button>
          <Button size="sm" className="bg-[#6A1B2E] hover:bg-[#521221] text-xs font-bold" onClick={() => showToast('Omnichannel ROAS Audit exported!')}>
            <BarChart3 className="w-4 h-4 mr-1.5" /> Export Campaign ROAS
          </Button>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: 'Avg Campaign ROAS', value: '4.8x Return', sub: '₹7.2L Spend YoY', color: 'text-emerald-700' },
          { label: 'Total Social Impressions', value: '2.84 Million', sub: 'Instagram + Meta + LinkedIn', color: 'text-purple-700' },
          { label: 'Total Inbound Leads', value: `${leads.length > 0 ? leads.length : 1420} Leads`, sub: 'Cost Per Lead ₹480', color: 'text-blue-700' },
          { label: 'Live Active Campaigns', value: `${campaigns.length} Campaigns`, sub: 'All ad channels healthy', color: 'text-[#6A1B2E]' },
        ].map((card, idx) => (
          <Card key={idx} className="p-4 border border-slate-200/70 shadow-xs">
            <span className="text-[10px] font-extrabold uppercase text-slate-400 block mb-1">{card.label}</span>
            <div className={`text-xl font-black ${card.color}`}>{card.value}</div>
            <div className="text-[10px] font-semibold text-slate-400 mt-1">{card.sub}</div>
          </Card>
        ))}
      </div>

      {/* Client Brand Target Bar */}
      <Card className="p-4 border border-slate-200/70 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <Sparkles className="w-4 h-4 text-[#6A1B2E]" />
          <span className="text-xs font-bold text-slate-700">Client Ad Creative Target:</span>
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
        <span className="text-xs font-bold text-slate-500">
          Showing real-time creative mockups configured for <strong className="text-slate-900">{activeClientName}</strong>
        </span>
      </Card>

      {/* Live Social Media & Ad Post Previews Showcase */}
      <div className="space-y-4">
        <h3 className="text-sm font-black text-slate-900 border-b border-slate-200 pb-2">Live Social Ad Creative Mockups</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {campaigns.map((cmp, idx) => (
            <Card key={cmp.id || idx} className="p-0 border border-slate-200 rounded-3xl overflow-hidden shadow-lg hover:shadow-2xl transition-all bg-white flex flex-col justify-between">
              <div className={`p-4 text-white flex items-center justify-between text-xs font-bold ${idx % 3 === 0 ? 'bg-gradient-to-r from-purple-600 via-pink-600 to-amber-500' : idx % 3 === 1 ? 'bg-blue-600' : 'bg-[#0A66C2]'}`}>
                <span className="flex items-center gap-1.5 font-black">{cmp.channel}</span>
                <span className="bg-white/20 px-2 py-0.5 rounded-full text-[10px] border border-white/30">{cmp.roas}</span>
              </div>
              <div className="p-5 space-y-4 text-left">
                <div className={`h-44 rounded-2xl p-4 text-white flex flex-col justify-between relative overflow-hidden ${idx % 3 === 0 ? 'bg-gradient-to-br from-pink-500 via-purple-700 to-slate-900' : idx % 3 === 1 ? 'bg-slate-900 border border-slate-800' : 'bg-slate-950 border border-slate-800'}`}>
                  <span className="text-[9px] font-black uppercase tracking-widest bg-black/40 px-2.5 py-1 rounded-full w-fit">
                    {activeClientName}
                  </span>
                  <div>
                    <p className="text-sm font-black text-white leading-snug">"{cmp.headline}"</p>
                    <span className="text-[10px] text-pink-200 font-bold block mt-1">#FerexDigital #EnterpriseGrowth</span>
                  </div>
                </div>
                <div className="flex items-center justify-between text-xs font-bold text-slate-600 pt-1">
                  <span className="flex items-center gap-1 text-pink-600"><Heart className="w-4 h-4 fill-current" /> {cmp.likes}</span>
                  <span className="flex items-center gap-1"><MessageCircle className="w-4 h-4" /> {cmp.comments}</span>
                  <span className="flex items-center gap-1"><Share2 className="w-4 h-4" /> {cmp.shares}</span>
                </div>
                <p className="text-xs font-semibold text-slate-500">Target Audience: {cmp.target}</p>
              </div>
            </Card>
          ))}
        </div>
      </div>

      {/* Create Campaign Modal */}
      <AnimatePresence>
        {showCreateModal && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50" onClick={() => setShowCreateModal(false)} />
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-md bg-white rounded-2xl shadow-2xl z-50 border border-slate-100 p-6">
              <div className="flex items-center justify-between mb-4 pb-2 border-b border-slate-100">
                <h3 className="text-sm font-black text-slate-900">Launch Ad Campaign</h3>
                <button onClick={() => setShowCreateModal(false)} className="p-1 text-slate-400 hover:text-slate-600"><X className="w-4 h-4" /></button>
              </div>
              <form onSubmit={handleCreateCampaign} className="space-y-3">
                <div>
                  <label className="block text-[10px] font-extrabold text-slate-400 uppercase mb-1">Campaign Title</label>
                  <input type="text" required value={newCampaign.name} onChange={(e) => setNewCampaign({ ...newCampaign, name: e.target.value })} className="w-full h-9 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold" />
                </div>
                <div>
                  <label className="block text-[10px] font-extrabold text-slate-400 uppercase mb-1">Ad Channel</label>
                  <select value={newCampaign.channel} onChange={(e) => setNewCampaign({ ...newCampaign, channel: e.target.value })} className="w-full h-9 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold">
                    <option value="Instagram Reels & Meta">Instagram Reels & Meta</option>
                    <option value="Google Search PPC">Google Search PPC</option>
                    <option value="LinkedIn B2B Sponsored">LinkedIn B2B Sponsored</option>
                    <option value="YouTube Shorts Ad">YouTube Shorts Ad</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-extrabold text-slate-400 uppercase mb-1">Creative Ad Headline</label>
                  <input type="text" required value={newCampaign.headline} onChange={(e) => setNewCampaign({ ...newCampaign, headline: e.target.value })} className="w-full h-9 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-extrabold text-slate-400 uppercase mb-1">Target ROAS</label>
                    <input type="text" required value={newCampaign.roas} onChange={(e) => setNewCampaign({ ...newCampaign, roas: e.target.value })} className="w-full h-9 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold" />
                  </div>
                  <div>
                    <label className="block text-[10px] font-extrabold text-slate-400 uppercase mb-1">Monthly Budget</label>
                    <input type="text" required value={newCampaign.monthlyBudget} onChange={(e) => setNewCampaign({ ...newCampaign, monthlyBudget: e.target.value })} className="w-full h-9 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold" />
                  </div>
                </div>
                <div>
                  <label className="block text-[10px] font-extrabold text-slate-400 uppercase mb-1">Target Audience</label>
                  <input type="text" required value={newCampaign.targetAudience} onChange={(e) => setNewCampaign({ ...newCampaign, targetAudience: e.target.value })} className="w-full h-9 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold" />
                </div>
                <div className="pt-3 flex gap-2">
                  <Button type="button" variant="outline" size="sm" className="flex-1 text-xs font-bold" onClick={() => setShowCreateModal(false)}>Cancel</Button>
                  <Button type="submit" size="sm" className="flex-1 text-xs font-bold bg-[#6A1B2E] hover:bg-[#521221]">Deploy Campaign</Button>
                </div>
              </form>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};
