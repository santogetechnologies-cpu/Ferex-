import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Megaphone, CheckCircle2, Heart, MessageCircle, Share2, BarChart3
} from 'lucide-react';
import { Card } from '../../components/Card';
import { Button } from '../../components/Button';

export const DigitalMarketing: React.FC = () => {
  const [toast, setToast] = useState('');
  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(''), 3000); };

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
            Multi-channel Instagram Reels, Google PPC, LinkedIn Sponsored Content, and ROAS performance analytics.
          </p>
        </div>
        <Button size="sm" className="bg-[#6A1B2E] hover:bg-[#521221] text-xs font-bold" onClick={() => showToast('Omnichannel ROAS Audit exported!')}>
          <BarChart3 className="w-4 h-4 mr-1.5" /> Export Campaign ROAS
        </Button>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: 'Avg Campaign ROAS', value: '4.8x Return', sub: '₹7.2L Spend YoY', color: 'text-emerald-700' },
          { label: 'Total Social Impressions', value: '2.84 Million', sub: 'Instagram + Meta + LinkedIn', color: 'text-purple-700' },
          { label: 'Total Leads Generated', value: '1,420 Leads', sub: 'Cost Per Lead ₹480', color: 'text-blue-700' },
          { label: 'Conversion Rate Avg', value: '8.9%', sub: 'Peak 12.1% LinkedIn B2B', color: 'text-[#6A1B2E]' },
        ].map((card, idx) => (
          <Card key={idx} className="p-4 border border-slate-200/70 shadow-xs">
            <span className="text-[10px] font-extrabold uppercase text-slate-400 block mb-1">{card.label}</span>
            <div className={`text-xl font-black ${card.color}`}>{card.value}</div>
            <div className="text-[10px] font-semibold text-slate-400 mt-1">{card.sub}</div>
          </Card>
        ))}
      </div>

      {/* SIGNATURE VISUAL FEATURE: Live Social Media & Ad Post Previews Showcase */}
      <div className="space-y-4">
        <h3 className="text-sm font-black text-slate-900 border-b border-slate-200 pb-2">Live Social Ad Creative Mockups</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Instagram Reel Mockup Card */}
          <Card className="p-0 border border-slate-200 rounded-3xl overflow-hidden shadow-lg hover:shadow-2xl transition-all bg-white flex flex-col justify-between">
            <div className="p-4 bg-gradient-to-r from-purple-600 via-pink-600 to-amber-500 text-white flex items-center justify-between text-xs font-bold">
              <span className="flex items-center gap-1.5"><InstagramIcon /> Instagram Reels Ad</span>
              <span className="bg-white/20 px-2 py-0.5 rounded-full text-[10px] border border-white/30">Active • 4.2x ROAS</span>
            </div>
            <div className="p-5 space-y-4 text-left">
              <div className="h-44 rounded-2xl bg-gradient-to-br from-pink-500 via-purple-700 to-slate-900 p-4 text-white flex flex-col justify-between relative overflow-hidden">
                <span className="text-[9px] font-black uppercase tracking-widest bg-black/40 px-2.5 py-1 rounded-full w-fit">Swiggy Gourmet</span>
                <div>
                  <p className="text-sm font-black text-white">"50% Off On First 3 Gourmet Orders!"</p>
                  <span className="text-[10px] text-pink-200 font-bold block mt-1">#SwiggyFoodie #GourmetDelight</span>
                </div>
              </div>
              <div className="flex items-center justify-between text-xs font-bold text-slate-600 pt-1">
                <span className="flex items-center gap-1 text-pink-600"><Heart className="w-4 h-4 fill-current" /> 42.8k Likes</span>
                <span className="flex items-center gap-1"><MessageCircle className="w-4 h-4" /> 1,240 Comments</span>
                <span className="flex items-center gap-1"><Share2 className="w-4 h-4" /> 3.4k Shares</span>
              </div>
              <p className="text-xs font-semibold text-slate-500">Target Audience: Food Enthusiasts 18-35 • Bengaluru & Mumbai</p>
            </div>
          </Card>

          {/* Google Search PPC Ad Card */}
          <Card className="p-0 border border-slate-200 rounded-3xl overflow-hidden shadow-lg hover:shadow-2xl transition-all bg-white flex flex-col justify-between">
            <div className="p-4 bg-blue-600 text-white flex items-center justify-between text-xs font-bold">
              <span className="flex items-center gap-1.5"><GoogleIcon /> Google Search PPC</span>
              <span className="bg-white/20 px-2 py-0.5 rounded-full text-[10px] border border-white/30">Active • 5.8% CTR</span>
            </div>
            <div className="p-5 space-y-3 text-left">
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-1.5">
                <span className="text-[10px] font-mono text-slate-500">https://www.reliancedigital.in/sale</span>
                <h4 className="text-xs font-black text-blue-800 hover:underline">Reliance Digital Festival Sale — Up to 60% Off Electronics</h4>
                <p className="text-[11px] font-semibold text-slate-600">Shop smartphones, laptops & TVs. Free same-day delivery & zero cost EMI available.</p>
                <div className="flex gap-2 pt-1 text-[10px] font-bold text-blue-700">
                  <span className="underline">Smartphones</span> • <span className="underline font-bold">Laptops</span> • <span className="underline">TV Deals</span>
                </div>
              </div>
              <p className="text-xs font-semibold text-slate-500">CPC: ₹14.20 • Monthly Spend: ₹3,50,000</p>
            </div>
          </Card>

          {/* LinkedIn B2B Sponsored Post Card */}
          <Card className="p-0 border border-slate-200 rounded-3xl overflow-hidden shadow-lg hover:shadow-2xl transition-all bg-white flex flex-col justify-between">
            <div className="p-4 bg-[#0A66C2] text-white flex items-center justify-between text-xs font-bold">
              <span className="flex items-center gap-1.5"><LinkedInIcon /> LinkedIn B2B Ad</span>
              <span className="bg-white/20 px-2 py-0.5 rounded-full text-[10px] border border-white/30">Active • 12.1% Conv</span>
            </div>
            <div className="p-5 space-y-3 text-left">
              <div className="p-4 rounded-2xl bg-slate-900 text-white space-y-2">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-md bg-blue-500 text-white flex items-center justify-center font-black text-[10px]">Z</div>
                  <span className="text-[11px] font-bold">Zomato Enterprise Solutions</span>
                </div>
                <p className="text-xs font-semibold text-slate-200">"Download 2026 Corporate Food Delivery Trends Report for CTOs & HR Heads."</p>
                <button onClick={() => showToast('Downloaded Whitepaper PDF demo!')} className="w-full py-1.5 bg-[#0A66C2] hover:bg-blue-600 text-white text-[11px] font-bold rounded-lg transition-all">
                  Download PDF Report (3.2 MB)
                </button>
              </div>
              <p className="text-xs font-semibold text-slate-500">Targeting: Enterprise CTOs, VP HR • Pan India</p>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};

const InstagramIcon = () => <span className="w-4 h-4 rounded-md bg-pink-500 text-white inline-flex items-center justify-center font-black text-[9px]">IG</span>;
const GoogleIcon = () => <span className="w-4 h-4 rounded-md bg-blue-500 text-white inline-flex items-center justify-center font-black text-[9px]">G</span>;
const LinkedInIcon = () => <span className="w-4 h-4 rounded-md bg-blue-700 text-white inline-flex items-center justify-center font-black text-[9px]">in</span>;
