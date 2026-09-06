import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Smartphone, CheckCircle2, Play, X, Send, Plus, RefreshCw, Cpu, ShieldCheck } from 'lucide-react';
import { Card } from '../../components/Card';
import { Button } from '../../components/Button';
import { getDigitalProjects, getDigitalEmployees } from '../../lib/api/digital';
import { supabase } from '../../lib/supabase';

export const DigitalMobileApps: React.FC = () => {
  const [toast, setToast] = useState('');
  const [projects, setProjects] = useState<any[]>([]);
  const [selectedProject, setSelectedProject] = useState<any | null>(null);
  const [selectedBuild, setSelectedBuild] = useState<any>(null);
  const [showBuildModal, setShowBuildModal] = useState(false);
  const [appReleases, setAppReleases] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [newBuild, setNewBuild] = useState({
    ver: 'v2.5.0 (Build 860)',
    platform: 'iOS & Android',
    status: 'Staging / TestFlight',
    notes: 'Optimized Hermes JS engine and enhanced biometrics flow'
  });

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(''), 3000);
  };

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [pData] = await Promise.all([
        getDigitalProjects(),
        getDigitalEmployees()
      ]);
      setProjects(pData || []);
      if (pData && pData.length > 0 && !selectedProject) {
        setSelectedProject(pData[0]);
      }

      const savedReleases = localStorage.getItem('ferex_digital_app_releases');
      if (savedReleases) {
        try {
          setAppReleases(JSON.parse(savedReleases));
          return;
        } catch {}
      }

      const initialReleases = [
        { id: 'rel-1', ver: 'v2.4.1 (Build 842)', date: new Date().toISOString().split('T')[0], platform: 'iOS & Android', status: 'App Store: In Review', crashRate: '0.08%', downloads: '45,200', notes: 'Native biometric auth and push sync' },
        { id: 'rel-2', ver: 'v2.4.0 (Build 820)', date: '2026-08-15', platform: 'iOS & Android', status: 'Live in Production', crashRate: '0.12%', downloads: '42,800', notes: 'Payment gateway integration v3' },
        { id: 'rel-3', ver: 'v2.3.8 (Build 795)', date: '2026-07-28', platform: 'iOS Only', status: 'Archived', crashRate: '0.15%', downloads: '38,100', notes: 'Legacy UI refresh' },
      ];
      setAppReleases(initialReleases);
      localStorage.setItem('ferex_digital_app_releases', JSON.stringify(initialReleases));
    } finally {
      setLoading(false);
    }
  }, [selectedProject]);

  useEffect(() => {
    loadData();

    const channel = supabase
      .channel('realtime_digital_apps')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'digital_projects' }, () => loadData())
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [loadData]);

  const handleCreateBuild = (e: React.FormEvent) => {
    e.preventDefault();
    const created = {
      id: `rel-${Date.now()}`,
      ver: newBuild.ver,
      date: new Date().toISOString().split('T')[0],
      platform: newBuild.platform,
      status: newBuild.status,
      crashRate: '0.00%',
      downloads: '0 (New)',
      notes: newBuild.notes
    };
    const updated = [created, ...appReleases];
    setAppReleases(updated);
    localStorage.setItem('ferex_digital_app_releases', JSON.stringify(updated));
    setShowBuildModal(false);
    showToast(`Dispatched cloud build for ${newBuild.ver}`);
  };

  const activeAppName = selectedProject?.title || 'Enterprise Mobile App';
  const activeClientName = selectedProject?.client?.company_name || 'Ferex Digital Enterprise';

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
          <p className="text-xs font-semibold text-slate-500 mt-1">
            Native iOS & Android build automation, TestFlight beta distribution, and live app telemetry for enterprise projects.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button size="sm" variant="outline" className="text-xs font-bold" onClick={() => setShowBuildModal(true)}>
            <Plus className="w-3.5 h-3.5 mr-1.5" /> Register Build
          </Button>
          <Button size="sm" className="bg-[#6A1B2E] hover:bg-[#521221] text-xs font-bold" onClick={() => showToast('Triggered Xcode & Gradle Cloud CI/CD Pipeline...')}>
            <Play className="w-3.5 h-3.5 mr-1.5" /> Trigger Cloud Build
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: 'Crash-Free Users %', value: '99.94%', sub: 'Sentry SLA Target: 99.5%', color: 'text-emerald-700' },
          { label: 'Active Beta Testers', value: '142 Devices', sub: 'TestFlight & Internal Play', color: 'text-purple-700' },
          { label: 'Avg Cold Launch Time', value: '0.38 Seconds', sub: 'React Native 0.74 Hermes', color: 'text-blue-700' },
          { label: 'Total Builds Deployed', value: `${appReleases.length} Builds`, sub: 'Automated CI/CD', color: 'text-[#6A1B2E]' },
        ].map((card, idx) => (
          <Card key={idx} className="p-4 border border-slate-200/70 shadow-xs">
            <span className="text-[10px] font-extrabold uppercase text-slate-400 block mb-1">{card.label}</span>
            <div className={`text-xl font-black ${card.color}`}>{card.value}</div>
            <div className="text-[10px] font-semibold text-slate-400 mt-1">{card.sub}</div>
          </Card>
        ))}
      </div>

      {/* Project Selector Bar */}
      <Card className="p-4 border border-slate-200/70 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <Smartphone className="w-4 h-4 text-[#6A1B2E]" />
          <span className="text-xs font-bold text-slate-700">Active Mobile Project:</span>
          <select
            value={selectedProject?.id || ''}
            onChange={(e) => setSelectedProject(projects.find(p => p.id === e.target.value) || null)}
            className="h-8 px-3 bg-slate-100 border border-slate-200 rounded-lg text-xs font-bold text-slate-900"
          >
            {projects.map(p => (
              <option key={p.id} value={p.id}>{p.title} ({p.client?.company_name || 'Client'})</option>
            ))}
          </select>
        </div>
        <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200">
          ✓ iOS (SwiftUI) & Android (Kotlin/RN) Target Active
        </span>
      </Card>

      {/* Device Preview & Version History Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Interactive Smartphone Mockup Preview */}
        <Card className="p-6 border border-slate-200/80 shadow-xs space-y-4 flex flex-col items-center justify-center text-center">
          <div className="flex items-center justify-between w-full">
            <span className="text-[10px] font-extrabold uppercase text-slate-400 tracking-widest">Live Device Preview</span>
            <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">Hermes v0.74</span>
          </div>
          <div className="w-60 h-[420px] bg-slate-950 rounded-[40px] p-3.5 shadow-2xl border-4 border-slate-800 relative overflow-hidden text-left">
            <div className="w-20 h-4 bg-slate-800 rounded-full mx-auto mb-3" />
            <div className="w-full h-[calc(100%-28px)] rounded-[28px] bg-gradient-to-b from-[#6A1B2E] via-[#521221] to-[#2A060E] text-white p-4 flex flex-col justify-between text-xs">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[9px] uppercase font-bold text-white/70 block truncate max-w-[120px]">{activeClientName}</span>
                  <span className="text-[9px] bg-white/20 px-2 py-0.5 rounded-full font-mono">v2.5</span>
                </div>
                <span className="font-black text-base block leading-tight">{activeAppName}</span>
                <div className="p-3 bg-white/15 backdrop-blur-md rounded-xl mt-2 space-y-1 border border-white/10">
                  <span className="text-[10px] font-bold text-white/80 block">Active Ledger Pipeline</span>
                  <span className="text-xl font-black text-emerald-300 block">₹{Number(selectedProject?.budget || 450000).toLocaleString('en-IN')}</span>
                  <span className="text-[9px] text-white/70 block">Progress: {selectedProject?.progress || 75}% Completed</span>
                </div>
              </div>
              <div className="space-y-2">
                <div className="p-2 bg-emerald-500/20 rounded-xl text-[10px] font-bold text-emerald-300 border border-emerald-400/30 text-center flex items-center justify-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5" /> Biometrics & 2FA Active
                </div>
                <div className="text-center text-[9px] text-white/50">Simulated on iPhone 15 Pro Max</div>
              </div>
            </div>
          </div>
          <p className="text-xs font-semibold text-slate-500">Live native render for {activeAppName}</p>
        </Card>

        {/* Version History & App Store Release Changelog */}
        <div className="lg:col-span-2 space-y-4">
          <Card className="p-6 border border-slate-200/80 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-sm font-black text-slate-900">App Version History & Store Releases</h3>
                <p className="text-xs font-semibold text-slate-400 mt-0.5">Automated TestFlight & Google Play Console release tracks</p>
              </div>
              <span className="text-xs font-bold text-slate-400">{appReleases.length} Release Tracks</span>
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
                    <tr key={rel.id || rel.ver} className="hover:bg-slate-50/80">
                      <td className="py-3 px-3 font-extrabold text-slate-900">
                        <div>{rel.ver}</div>
                        <span className="text-[10px] text-slate-400 font-normal">{rel.notes}</span>
                      </td>
                      <td className="py-3 px-3 text-slate-600">{rel.date}</td>
                      <td className="py-3 px-3 font-extrabold text-blue-700">
                        <span className="px-2 py-0.5 rounded-full text-[10px] bg-blue-50 border border-blue-200">{rel.status}</span>
                      </td>
                      <td className="py-3 px-3 font-bold text-emerald-600">{rel.crashRate}</td>
                      <td className="py-3 px-3 text-right">
                        <button onClick={() => setSelectedBuild(rel)} className="text-[10px] font-black text-[#6A1B2E] hover:underline bg-[#6A1B2E]/10 px-2.5 py-1 rounded-lg">
                          Beta Invite
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      </div>

      {/* Register Build Modal */}
      <AnimatePresence>
        {showBuildModal && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50" onClick={() => setShowBuildModal(false)} />
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-md bg-white rounded-2xl shadow-2xl z-50 border border-slate-100 p-6">
              <div className="flex items-center justify-between mb-4 pb-2 border-b border-slate-100">
                <h3 className="text-sm font-black text-slate-900">Register New Mobile App Build</h3>
                <button onClick={() => setShowBuildModal(false)} className="p-1 text-slate-400 hover:text-slate-600"><X className="w-4 h-4" /></button>
              </div>
              <form onSubmit={handleCreateBuild} className="space-y-3">
                <div>
                  <label className="block text-[10px] font-extrabold text-slate-400 uppercase mb-1">Version & Build Number</label>
                  <input type="text" required value={newBuild.ver} onChange={(e) => setNewBuild({ ...newBuild, ver: e.target.value })} className="w-full h-9 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold" />
                </div>
                <div>
                  <label className="block text-[10px] font-extrabold text-slate-400 uppercase mb-1">Target Platforms</label>
                  <select value={newBuild.platform} onChange={(e) => setNewBuild({ ...newBuild, platform: e.target.value })} className="w-full h-9 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold">
                    <option value="iOS & Android">iOS & Android (Dual Build)</option>
                    <option value="iOS Only">iOS (App Store & TestFlight)</option>
                    <option value="Android Only">Android (Google Play Console)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-extrabold text-slate-400 uppercase mb-1">Release Status</label>
                  <select value={newBuild.status} onChange={(e) => setNewBuild({ ...newBuild, status: e.target.value })} className="w-full h-9 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold">
                    <option value="Staging / TestFlight">Staging / TestFlight</option>
                    <option value="App Store: In Review">App Store: In Review</option>
                    <option value="Live in Production">Live in Production</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-extrabold text-slate-400 uppercase mb-1">Changelog & Release Notes</label>
                  <textarea required value={newBuild.notes} onChange={(e) => setNewBuild({ ...newBuild, notes: e.target.value })} rows={2} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold" />
                </div>
                <div className="pt-3 flex gap-2">
                  <Button type="button" variant="outline" size="sm" className="flex-1 text-xs font-bold" onClick={() => setShowBuildModal(false)}>Cancel</Button>
                  <Button type="submit" size="sm" className="flex-1 text-xs font-bold bg-[#6A1B2E] hover:bg-[#521221]">Dispatch Build</Button>
                </div>
              </form>
            </motion.div>
          </>
        )}
      </AnimatePresence>

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
                <p><span className="font-bold text-slate-900">Target Platforms:</span> {selectedBuild.platform}</p>
                <p><span className="font-bold text-slate-900">Current Status:</span> {selectedBuild.status}</p>
                <p><span className="font-bold text-slate-900">Crash Rate:</span> {selectedBuild.crashRate}</p>
                <p><span className="font-bold text-slate-900">Release Notes:</span> {selectedBuild.notes}</p>
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
