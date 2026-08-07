import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Smartphone, CheckCircle2, Play, X, Send } from 'lucide-react';
import { Card } from '../../components/Card';
import { Button } from '../../components/Button';

const appReleases = [
  { ver: 'v2.4.1 (Build 842)', date: '2026-08-04', platform: 'iOS & Android', status: 'App Store: In Review', crashRate: '0.08%', downloads: '45,200' },
  { ver: 'v2.4.0 (Build 820)', date: '2026-07-28', platform: 'iOS & Android', status: 'Live in Production', crashRate: '0.12%', downloads: '42,800' },
  { ver: 'v2.3.8 (Build 795)', date: '2026-07-15', platform: 'iOS Only', status: 'Archived', crashRate: '0.15%', downloads: '38,100' },
];

export const DigitalMobileApps: React.FC = () => {
  const [toast, setToast] = useState('');
  const [selectedBuild, setSelectedBuild] = useState<any>(null);
  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(''), 3000); };

  return (
    <div className="space-y-6 text-left antialiased">
      <AnimatePresence>
        {toast && (
          <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="fixed top-20 right-8 z-50 bg-[#6A1B2E] text-white text-xs font-bold px-4 py-2.5 rounded-xl shadow-xl flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />{toast}
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-black text-slate-900 flex items-center gap-2">
            <Smartphone className="w-5 h-5 text-[#6A1B2E]" /> App Development Studio & Device Farm
          </h1>
          <p className="text-xs font-semibold text-slate-500 mt-1">Native iOS & Android build automation, TestFlight beta distribution, and crash report analytics.</p>
        </div>
        <Button size="sm" className="bg-[#6A1B2E] hover:bg-[#521221] text-xs font-bold" onClick={() => showToast('Triggered Xcode & Gradle Cloud Build...')}>
          <Play className="w-3.5 h-3.5 mr-1.5" /> Trigger Cloud Build
        </Button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: 'Crash-Free Users %', value: '99.92%', sub: 'Sentry SLA Target: 99.5%', color: 'text-emerald-700' },
          { label: 'Active Beta Testers', value: '142 Devices', sub: 'TestFlight & Internal Play', color: 'text-purple-700' },
          { label: 'Avg Cold Launch Time', value: '0.42 Seconds', sub: 'React Native 0.74 Hermes', color: 'text-blue-700' },
          { label: 'App Store Rating', value: '4.8 / 5.0', sub: '3,420 Reviews', color: 'text-[#6A1B2E]' },
        ].map((card, idx) => (
          <Card key={idx} className="p-4 border border-slate-200/70 shadow-xs">
            <span className="text-[10px] font-extrabold uppercase text-slate-400 block mb-1">{card.label}</span>
            <div className={`text-xl font-black ${card.color}`}>{card.value}</div>
            <div className="text-[10px] font-semibold text-slate-400 mt-1">{card.sub}</div>
          </Card>
        ))}
      </div>

      {/* Device Preview & Version History Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Interactive Smartphone Mockup Preview */}
        <Card className="p-6 border border-slate-200/80 shadow-xs space-y-4 flex flex-col items-center justify-center text-center">
          <span className="text-[10px] font-extrabold uppercase text-slate-400 tracking-widest">Live Device Preview</span>
          <div className="w-56 h-96 bg-slate-900 rounded-[36px] p-3 shadow-2xl border-4 border-slate-800 relative overflow-hidden text-left">
            <div className="w-20 h-4 bg-slate-800 rounded-full mx-auto mb-3" />
            <div className="w-full h-[calc(100%-24px)] rounded-[24px] bg-gradient-to-b from-[#6A1B2E] via-[#521221] to-[#3B0B16] text-white p-4 flex flex-col justify-between text-xs">
              <div className="space-y-1">
                <span className="text-[9px] uppercase font-bold text-white/70 block">Mahindra Fintech</span>
                <span className="font-black text-base block leading-tight">Mobile Banking v2.4</span>
                <div className="p-2.5 bg-white/15 backdrop-blur-md rounded-xl mt-3 space-y-1">
                  <span className="text-[10px] font-bold block">Available Balance</span>
                  <span className="text-xl font-black text-emerald-300 block">₹4,85,200.00</span>
                </div>
              </div>
              <div className="p-2 bg-emerald-500/20 rounded-xl text-[10px] font-bold text-emerald-300 border border-emerald-400/30 text-center">
                ✓ Face ID / Touch ID Enabled
              </div>
            </div>
          </div>
          <p className="text-xs font-semibold text-slate-500">Live preview rendered on simulated iPhone 15 Pro</p>
        </Card>

        {/* Version History & App Store Release Changelog */}
        <div className="lg:col-span-2 space-y-4">
          <Card className="p-6 border border-slate-200/80 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-sm font-black text-slate-900">App Version History & Store Releases</h3>
              <span className="text-xs font-bold text-slate-400">3 Build Releases</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200/80 text-[10px] font-black uppercase text-slate-400">
                    <th className="py-2.5 px-3">Build Version</th>
                    <th className="py-2.5 px-3">Release Date</th>
                    <th className="py-2.5 px-3">Store Status</th>
                    <th className="py-2.5 px-3">Crash Rate</th>
                    <th className="py-2.5 px-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs font-semibold text-slate-700">
                  {appReleases.map(rel => (
                    <tr key={rel.ver} className="hover:bg-slate-50/80">
                      <td className="py-3 px-3 font-extrabold text-slate-900">{rel.ver}</td>
                      <td className="py-3 px-3 text-slate-600">{rel.date}</td>
                      <td className="py-3 px-3 font-extrabold text-blue-700">{rel.status}</td>
                      <td className="py-3 px-3 font-bold text-emerald-600">{rel.crashRate}</td>
                      <td className="py-3 px-3 text-right">
                        <button onClick={() => setSelectedBuild(rel)} className="text-[10px] font-black text-[#6A1B2E] hover:underline">Beta Invite</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      </div>

      {/* Beta Invite Drawer */}
      <AnimatePresence>
        {selectedBuild && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 0.4 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-slate-900 z-40" onClick={() => setSelectedBuild(null)} />
            <motion.div initial={{ translateX: '100%' }} animate={{ translateX: 0 }} exit={{ translateX: '100%' }} transition={{ duration: 0.25 }} className="fixed top-0 right-0 h-screen w-full max-w-md bg-white z-50 shadow-2xl p-6 overflow-y-auto space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <h3 className="text-sm font-black text-slate-900">{selectedBuild.ver}</h3>
                <button onClick={() => setSelectedBuild(null)} className="p-1 text-slate-400 hover:text-slate-600"><X className="w-4 h-4" /></button>
              </div>
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 space-y-2 text-xs font-semibold">
                <p>Platforms: {selectedBuild.platform}</p>
                <p>Status: {selectedBuild.status}</p>
                <p>Crash Rate: {selectedBuild.crashRate}</p>
              </div>
              <Button size="sm" className="w-full bg-[#6A1B2E] hover:bg-[#521221] text-xs font-bold" onClick={() => { showToast(`TestFlight Beta invite sent for ${selectedBuild.ver}`); setSelectedBuild(null); }}>
                Send TestFlight Invite <Send className="w-3.5 h-3.5 ml-1.5" />
              </Button>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};
