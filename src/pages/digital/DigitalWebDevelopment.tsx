import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Code, CheckCircle2, Terminal, X,
  Laptop, Tablet, Smartphone, Lock, GitBranch, Server
} from 'lucide-react';
import { Card } from '../../components/Card';
import { Button } from '../../components/Button';

const commitsList = [
  { hash: 'e92f41', msg: 'feat: add Razorpay payment webhook handler', author: 'Arun Patel', time: '20m ago', branch: 'main' },
  { hash: '8c4b12', msg: 'fix: cart item quantity sync issue on mobile', author: 'Sneha Roy', time: '2h ago', branch: 'feature/checkout' },
  { hash: '3f9d01', msg: 'perf: optimize Core Web Vitals LCP to 0.8s', author: 'Vivek Sharma', time: '5h ago', branch: 'main' },
];

const apiEndpoints = [
  { method: 'GET', path: '/api/v1/products/catalog', status: '200 OK', latency: '24ms', uptime: '99.99%' },
  { method: 'POST', path: '/api/v1/cart/checkout-webhook', status: '200 OK', latency: '85ms', uptime: '99.95%' },
  { method: 'GET', path: '/api/v1/user/auth-session', status: '200 OK', latency: '18ms', uptime: '100%' },
];

export const DigitalWebDevelopment: React.FC = () => {
  const [toast, setToast] = useState('');
  const [showTerminal, setShowTerminal] = useState(false);
  const [viewport, setViewport] = useState<'desktop' | 'tablet' | 'mobile'>('desktop');
  const [env, setEnv] = useState<'Production' | 'Staging' | 'Development'>('Production');
  const [showDevTools, setShowDevTools] = useState(false);

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

      {/* Software Engineering Operations Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-black uppercase bg-[#6A1B2E]/10 text-[#6A1B2E] px-2.5 py-0.5 rounded-full border border-[#6A1B2E]/20">
              GitHub + Vercel + Linear Workspace
            </span>
          </div>
          <h1 className="text-xl font-black text-slate-900 flex items-center gap-2 mt-1">
            <Code className="w-5 h-5 text-[#6A1B2E]" /> Web Engineering & DevOps Workspace
          </h1>
          <p className="text-xs font-semibold text-slate-500 mt-0.5">
            Live browser viewport, Vercel build #842, Git commits, API latency monitor, and DevTools console.
          </p>
        </div>

        {/* Environment Switcher */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs font-bold">
            {(['Production', 'Staging', 'Development'] as const).map(item => (
              <button
                key={item}
                onClick={() => { setEnv(item); showToast(`Switched environment to ${item}`); }}
                className={`px-3 py-1 rounded-lg transition-all ${env === item ? 'bg-[#6A1B2E] text-white shadow-2xs' : 'text-slate-600 hover:text-slate-900'}`}
              >
                {item}
              </button>
            ))}
          </div>
          <Button size="sm" className="bg-[#6A1B2E] hover:bg-[#521221] text-xs font-bold" onClick={() => setShowTerminal(true)}>
            <Terminal className="w-4 h-4 mr-1.5" /> Vercel CLI Terminal
          </Button>
        </div>
      </div>

      {/* Lighthouse Scores Bar */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: 'Lighthouse Performance', value: '98 / 100', sub: 'PageSpeed LCP 0.8s', color: 'text-emerald-700' },
          { label: 'Lighthouse Accessibility', value: '100 / 100', sub: 'WCAG 2.1 AA Compliant', color: 'text-blue-700' },
          { label: 'Best Practices Score', value: '96 / 100', sub: 'Security & HTTPS Headers', color: 'text-purple-700' },
          { label: 'Lighthouse SEO Score', value: '100 / 100', sub: 'Indexable & Structured Data', color: 'text-[#6A1B2E]' },
        ].map((card, idx) => (
          <Card key={idx} className="p-4 border border-slate-200/70 shadow-xs">
            <span className="text-[10px] font-extrabold uppercase text-slate-400 block mb-1">{card.label}</span>
            <div className={`text-xl font-black ${card.color}`}>{card.value}</div>
            <div className="text-[10px] font-semibold text-slate-400 mt-1">{card.sub}</div>
          </Card>
        ))}
      </div>

      {/* Live Desktop Browser Frame Mockup with DevTools Toggle */}
      <Card className="p-0 border border-slate-300 rounded-3xl shadow-xl overflow-hidden bg-slate-900">
        {/* Browser Header Bar */}
        <div className="bg-slate-800 border-b border-slate-700 px-4 py-3 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2 shrink-0">
            <div className="w-3 h-3 rounded-full bg-red-500" />
            <div className="w-3 h-3 rounded-full bg-amber-500" />
            <div className="w-3 h-3 rounded-full bg-emerald-500" />
          </div>

          <div className="flex-1 max-w-xl bg-slate-950 text-slate-200 px-3 py-1.5 rounded-xl border border-slate-700/80 flex items-center justify-between gap-2 font-mono text-[11px]">
            <div className="flex items-center gap-1.5 truncate">
              <Lock className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              <span className="text-slate-400">https://</span>
              <span className="text-white font-bold truncate">store.reliancedigital.in</span>
            </div>
            <span className="text-[9.5px] bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded-md font-sans font-bold">{env}</span>
          </div>

          <div className="flex items-center gap-2">
            <button onClick={() => setShowDevTools(!showDevTools)} className={`px-2.5 py-1 rounded-lg text-xs font-bold border transition-all ${showDevTools ? 'bg-amber-500 text-slate-950 border-amber-400' : 'bg-slate-900 text-slate-300 border-slate-700 hover:text-white'}`}>
              DevTools Console
            </button>
            <div className="flex items-center gap-1 bg-slate-900 p-1 rounded-xl border border-slate-700">
              <button onClick={() => setViewport('desktop')} className={`p-1.5 rounded-lg transition-all ${viewport === 'desktop' ? 'bg-[#6A1B2E] text-white' : 'text-slate-400 hover:text-white'}`}><Laptop className="w-4 h-4" /></button>
              <button onClick={() => setViewport('tablet')} className={`p-1.5 rounded-lg transition-all ${viewport === 'tablet' ? 'bg-[#6A1B2E] text-white' : 'text-slate-400 hover:text-white'}`}><Tablet className="w-4 h-4" /></button>
              <button onClick={() => setViewport('mobile')} className={`p-1.5 rounded-lg transition-all ${viewport === 'mobile' ? 'bg-[#6A1B2E] text-white' : 'text-slate-400 hover:text-white'}`}><Smartphone className="w-4 h-4" /></button>
            </div>
          </div>
        </div>

        {/* Live Web Content Canvas */}
        <div className="p-6 bg-slate-100 min-h-[380px] flex flex-col items-center justify-center transition-all">
          <div className={`bg-white rounded-2xl shadow-2xl transition-all duration-300 overflow-hidden border border-slate-200 ${viewport === 'desktop' ? 'w-full max-w-5xl' : viewport === 'tablet' ? 'w-[640px]' : 'w-[360px]'}`}>
            <div className="p-6 space-y-6 text-left">
              <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-[#6A1B2E] text-white flex items-center justify-center font-black">RD</div>
                  <span className="font-black text-slate-900 text-sm">Reliance Digital Store</span>
                </div>
                <div className="flex items-center gap-3 text-xs font-bold text-slate-600">
                  <span className="text-[#6A1B2E]">Electronics</span>
                  <span>Smartphones</span>
                  <span>Laptops</span>
                  <span className="bg-[#6A1B2E] text-white px-3 py-1 rounded-lg text-[11px]">Cart (3)</span>
                </div>
              </div>

              <div className="rounded-2xl bg-gradient-to-r from-slate-900 to-[#6A1B2E] text-white p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="space-y-1">
                  <span className="text-[10px] font-black uppercase text-amber-400 bg-amber-400/20 px-2 py-0.5 rounded">Special Festival Sale</span>
                  <h2 className="text-lg font-black text-white">Apple iPhone 15 Pro Max</h2>
                  <p className="text-xs text-white/80 font-semibold">Flat ₹10,000 instant cashback on HDFC cards</p>
                </div>
                <button onClick={() => showToast('Added iPhone 15 Pro to Cart!')} className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-black text-xs rounded-xl shrink-0 transition-all">
                  Buy Now — ₹1,34,900
                </button>
              </div>
            </div>
          </div>

          {/* Chrome DevTools Drawer Panel */}
          {showDevTools && (
            <div className="w-full max-w-5xl mt-4 bg-slate-950 rounded-2xl border border-slate-800 text-left font-mono text-xs text-emerald-400 p-4 space-y-2">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2 text-slate-400 text-[11px] font-bold">
                <span>Chrome DevTools Console • Network: 200 OK</span>
                <button onClick={() => setShowDevTools(false)} className="hover:text-white"><X className="w-4 h-4" /></button>
              </div>
              <p className="text-slate-400">[INFO] Client environment: {env}</p>
              <p className="text-white">[LOG] React 18 hydration completed in 14ms</p>
              <p className="text-emerald-400">[API] GET /api/v1/products/catalog — 200 OK (24ms)</p>
              <p className="text-emerald-400">[API] POST /api/v1/cart/checkout-webhook — 200 OK (85ms)</p>
            </div>
          )}
        </div>
      </Card>

      {/* API Latency Monitor & Git Branch Stream */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* API Health Monitor */}
        <Card className="p-5 border border-slate-200/80 shadow-xs space-y-3">
          <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
            <Server className="w-4 h-4 text-[#6A1B2E]" /> REST & GraphQL API Health Monitor
          </h3>
          <div className="space-y-2 text-xs font-mono">
            {apiEndpoints.map((api, i) => (
              <div key={i} className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between">
                <div>
                  <span className="font-bold text-blue-700 mr-2">{api.method}</span>
                  <span className="font-extrabold text-slate-900">{api.path}</span>
                </div>
                <div className="flex items-center gap-3 text-[11px]">
                  <span className="font-black text-emerald-600">{api.latency}</span>
                  <span className="bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded font-bold border border-emerald-200">{api.status}</span>
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* Git Branch Commits */}
        <Card className="p-5 border border-slate-200/80 shadow-xs space-y-3">
          <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
            <GitBranch className="w-4 h-4 text-[#6A1B2E]" /> Active Git Commits Stream
          </h3>
          <div className="space-y-2 text-xs font-mono">
            {commitsList.map((c, i) => (
              <div key={i} className="p-3 rounded-xl bg-slate-50 border border-slate-100 space-y-1">
                <div className="flex justify-between text-[10px] text-slate-400 font-bold">
                  <span>{c.hash} • {c.branch}</span>
                  <span>{c.time}</span>
                </div>
                <p className="text-slate-800 font-semibold">{c.msg}</p>
                <span className="text-[10px] text-slate-500 font-bold block">Author: {c.author}</span>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* Terminal Drawer */}
      <AnimatePresence>
        {showTerminal && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 0.4 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-slate-900 z-40" onClick={() => setShowTerminal(false)} />
            <motion.div initial={{ translateX: '100%' }} animate={{ translateX: 0 }} exit={{ translateX: '100%' }} transition={{ duration: 0.25 }} className="fixed top-0 right-0 h-screen w-full max-w-md bg-[#0F172A] text-emerald-400 z-50 p-6 font-mono text-xs overflow-y-auto space-y-4">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3 text-slate-300">
                <span className="font-bold flex items-center gap-2"><Terminal className="w-4 h-4" /> Vercel CLI Terminal</span>
                <button onClick={() => setShowTerminal(false)} className="text-slate-400 hover:text-white"><X className="w-4 h-4" /></button>
              </div>
              <div className="space-y-2 leading-relaxed">
                <p className="text-slate-400">$ vercel deploy --prod</p>
                <p>✓ Injecting environment variables from .env.{env.toLowerCase()}</p>
                <p className="text-white">✓ Compiled 2,318 modules in 244ms</p>
                <p className="text-emerald-400">✓ Production Ready: https://store.reliancedigital.in</p>
              </div>
              <Button size="sm" className="w-full bg-emerald-600 hover:bg-emerald-700 text-slate-950 font-black text-xs" onClick={() => { showToast('Deployment confirmed!'); setShowTerminal(false); }}>
                Confirm Release Build
              </Button>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};
