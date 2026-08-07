import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import {
  Globe, Truck, FileSpreadsheet, Building2, CreditCard, ArrowUpRight,
  CheckCircle2, ShieldCheck, Anchor, FileCheck2
} from 'lucide-react';
import { Card } from '../../components/Card';
import { Button } from '../../components/Button';

export const TradeDashboard: React.FC = () => {
  const navigate = useNavigate();
  const [toast, setToast] = useState('');

  const showToastMsg = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(''), 3000);
  };

  return (
    <div className="space-y-6 text-left antialiased">
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed top-20 right-8 z-50 bg-[#6A1B2E] text-white text-xs font-bold px-4 py-2.5 rounded-xl shadow-xl flex items-center gap-2"
          >
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            {toast}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Hero Banner */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-[#6A1B2E] via-[#521221] to-[#3B0B16] text-white p-6 md:p-8 shadow-xl border border-[#6A1B2E]/30">
        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-2 max-w-2xl">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[10px] uppercase font-black tracking-widest bg-white/15 backdrop-blur-md px-3 py-1 rounded-full border border-white/20 text-white">
                Executive Command Console
              </span>
              <span className="text-[10px] font-extrabold text-emerald-300 bg-emerald-500/20 px-2.5 py-1 rounded-full border border-emerald-400/30 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" /> Ports Sync Online
              </span>
            </div>
            <h1 className="text-2xl md:text-3xl font-black tracking-tight text-white">
              Ferex Global Trade Operations
            </h1>
            <p className="text-xs md:text-sm text-white/85 leading-relaxed font-semibold">
              Managing international supply chains, Bills of Lading, container dispatch, and Letters of Credit across 18 European & Asian maritime ports.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3 shrink-0">
            <button
              onClick={() => navigate('/trade/shipments')}
              className="h-10 px-5 rounded-xl text-xs font-black text-[#6A1B2E] bg-white hover:bg-slate-100 transition-all shadow-md flex items-center gap-2 cursor-pointer"
            >
              Track Active Containers <ArrowUpRight className="w-4 h-4" />
            </button>
            <button
              onClick={() => navigate('/trade/letters-of-credit')}
              className="h-10 px-5 rounded-xl text-xs font-black text-white bg-white/15 hover:bg-white/25 border border-white/30 transition-all shadow-xs cursor-pointer"
            >
              View Letters of Credit
            </button>
          </div>
        </div>
      </div>

      {/* KPI Cards Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { title: 'Containers in Transit', value: '28 Units', sub: '12 Maritime · 16 Air Cargo', icon: Truck, color: 'text-indigo-600 bg-indigo-50 border-indigo-100', badge: '+4 Today', path: '/trade/shipments' },
          { title: 'Total Trade Volume', value: '₹4.82 Cr', sub: 'Q3 Forecast +18.4%', icon: Globe, color: 'text-blue-600 bg-blue-50 border-blue-100', badge: 'Active Ledger', path: '/trade/bills-of-lading' },
          { title: 'Open Letters of Credit', value: '₹1.45 Cr', sub: '8 Verified Banking Lines', icon: Building2, color: 'text-emerald-600 bg-emerald-50 border-emerald-100', badge: 'HSBC Cleared', path: '/trade/letters-of-credit' },
          { title: 'Cleared Payments', value: '₹3.92 Cr', sub: '0 Overdue Accounts', icon: CreditCard, color: 'text-[#6A1B2E] bg-[#6A1B2E]/10 border-[#6A1B2E]/20', badge: '100% On-Time', path: '/trade/financials' },
        ].map((stat, idx) => (
          <Card key={idx} onClick={() => navigate(stat.path)} className="p-5 border border-slate-200/80 hover:border-slate-300 hover:shadow-lg hover:-translate-y-1 transition-all cursor-pointer group flex flex-col justify-between h-full">
            <div>
              <div className="flex items-center justify-between mb-3">
                <div className={`w-11 h-11 rounded-xl border flex items-center justify-center ${stat.color} group-hover:scale-105 transition-transform`}>
                  <stat.icon className="w-5 h-5" />
                </div>
                <span className="text-[10px] font-extrabold text-slate-600 bg-slate-100 px-2.5 py-0.5 rounded-full border border-slate-200">
                  {stat.badge}
                </span>
              </div>
              <span className="text-[10.5px] font-extrabold uppercase tracking-wider text-slate-400 block mb-0.5">{stat.title}</span>
              <span className="text-2xl font-black text-slate-900 leading-none">{stat.value}</span>
            </div>
            <div className="mt-3 pt-3 border-t border-slate-100 text-[10.5px] font-extrabold text-slate-500 truncate">
              {stat.sub}
            </div>
          </Card>
        ))}
      </div>

      {/* Main Workspace Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left 2 Cols: Trade Chart & Live Port Operations */}
        <div className="lg:col-span-2 space-y-6">
          {/* Trade Performance Chart */}
          <Card className="p-6 text-left border border-slate-200/70 shadow-xs">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-5">
              <div>
                <h3 className="text-sm font-black text-slate-900">Trade Volume & Freight Movement (₹)</h3>
                <p className="text-xs text-slate-400 font-semibold mt-0.5">Monthly cargo valuation and import/export trend</p>
              </div>
              <span className="text-[10px] font-extrabold text-[#6A1B2E] bg-[#6A1B2E]/10 px-3 py-1 rounded-full uppercase border border-[#6A1B2E]/20">
                Monthly Volume: ₹84.5 Lakhs
              </span>
            </div>

            {/* SVG Chart */}
            <div className="h-[210px] w-full relative">
              <svg className="w-full h-full" viewBox="0 0 500 200" preserveAspectRatio="none">
                <defs>
                  <linearGradient id="trade-grad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#6A1B2E" stopOpacity="0.22" />
                    <stop offset="100%" stopColor="#6A1B2E" stopOpacity="0.0" />
                  </linearGradient>
                </defs>
                <line x1="0" y1="40" x2="500" y2="40" stroke="#f1f5f9" strokeWidth="1" />
                <line x1="0" y1="90" x2="500" y2="90" stroke="#f1f5f9" strokeWidth="1" />
                <line x1="0" y1="140" x2="500" y2="140" stroke="#f1f5f9" strokeWidth="1" />
                
                <path d="M 0 150 Q 100 110, 200 120 T 400 50 T 500 30 L 500 200 L 0 200 Z" fill="url(#trade-grad)" />
                <path d="M 0 150 Q 100 110, 200 120 T 400 50 T 500 30" fill="none" stroke="#6A1B2E" strokeWidth="3.5" strokeLinecap="round" />
                <circle cx="200" cy="120" r="5" fill="#6A1B2E" stroke="white" strokeWidth="2" />
                <circle cx="400" cy="50" r="5" fill="#6A1B2E" stroke="white" strokeWidth="2" />
              </svg>
              <div className="absolute top-[30px] left-[340px] bg-slate-900 text-white text-[9px] font-bold px-2.5 py-1 rounded shadow-md pointer-events-none select-none">
                Peak Freight: ₹1.12 Cr
              </div>
            </div>

            <div className="flex items-center justify-between text-[10px] font-bold text-slate-400 mt-2 px-1 select-none">
              <span>May 2026</span>
              <span>Jun 2026</span>
              <span>Jul 2026</span>
              <span>Aug 2026 (Active)</span>
            </div>
          </Card>

          {/* Active Maritime Port Tracker */}
          <Card className="p-6 text-left border border-slate-200/70 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
                <Anchor className="w-4 h-4 text-[#6A1B2E]" /> Global Port Hubs Status
              </h3>
              <button onClick={() => navigate('/trade/shipments')} className="text-xs font-bold text-[#6A1B2E] hover:underline">
                View All Shipments
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {[
                { port: 'Port of Gdansk', country: '🇵🇱 Poland', status: 'Customs Clear', count: '12 Containers' },
                { port: 'Port of Hamburg', country: '🇩🇪 Germany', status: 'In Transit', count: '9 Containers' },
                { port: 'Port of Rotterdam', country: '🇳🇱 Netherlands', status: 'Docking', count: '7 Containers' },
              ].map((p, idx) => (
                <div key={idx} className="p-3.5 bg-slate-50 rounded-xl border border-slate-100 space-y-1">
                  <div className="text-[10px] font-black uppercase text-slate-400">{p.country}</div>
                  <div className="text-xs font-black text-slate-900">{p.port}</div>
                  <div className="flex items-center justify-between pt-1">
                    <span className="text-[9px] font-extrabold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">{p.status}</span>
                    <span className="text-[10px] font-bold text-slate-500">{p.count}</span>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>

        {/* Right Col: Quick Actions, Trade Alerts, Pending LC */}
        <div className="space-y-6 text-left">
          
          {/* Quick Action Cards */}
          <Card className="p-5 border border-slate-200/70 shadow-xs">
            <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider mb-3">
              Trade Executive Quick Actions
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {[
                { title: 'Shipments', path: '/trade/shipments', icon: Truck },
                { title: 'Invoices', path: '/trade/invoices', icon: FileSpreadsheet },
                { title: 'Letter of Credit', path: '/trade/letters-of-credit', icon: Building2 },
                { title: 'Trade CRM', path: '/trade/crm', icon: Globe },
                { title: 'Certificates', path: '/trade/certificates', icon: FileCheck2 },
                { title: 'Payments', path: '/trade/payments', icon: CreditCard },
              ].map((act, idx) => (
                <button
                  key={idx}
                  onClick={() => navigate(act.path)}
                  className="p-3 rounded-xl border border-slate-200/80 hover:border-[#6A1B2E]/40 hover:bg-slate-50 transition-all cursor-pointer group text-left flex items-center gap-2.5"
                >
                  <div className="w-7 h-7 rounded-lg bg-[#6A1B2E]/10 text-[#6A1B2E] group-hover:bg-[#6A1B2E] group-hover:text-white flex items-center justify-center transition-colors shrink-0">
                    <act.icon className="w-3.5 h-3.5" />
                  </div>
                  <span className="text-xs font-bold text-slate-900 group-hover:text-[#6A1B2E] truncate">{act.title}</span>
                </button>
              ))}
            </div>
          </Card>

          {/* Pending LC Authorization Widget */}
          <Card className="p-5 border-l-4 border-l-[#6A1B2E] border-slate-200/70 shadow-xs">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2.5 mb-3">
              <h3 className="text-xs font-black text-[#6A1B2E] uppercase tracking-wider flex items-center gap-1.5">
                <Building2 className="w-4 h-4" /> Letter of Credit Pending
              </h3>
              <span className="text-[10px] font-extrabold text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                HSBC Verified
              </span>
            </div>

            <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-100 space-y-1 mb-3">
              <div className="text-xs font-black text-slate-900">LC-2026-8810 · ₹1,45,000</div>
              <div className="text-[11px] font-semibold text-slate-500">Beneficiary: Warsaw Trade Corp</div>
              <div className="text-[10px] font-bold text-slate-400 pt-1 flex items-center gap-3">
                <span>Issuing Bank: HSBC London</span>
                <span>Expiry: Sep 30, 2026</span>
              </div>
            </div>

            <Button size="sm" className="w-full text-xs font-bold bg-[#6A1B2E] hover:bg-[#521221]" onClick={() => {
              showToastMsg('Letter of Credit LC-2026-8810 authorized!');
            }}>
              Authorize LC Execution
            </Button>
          </Card>

          {/* Critical Trade Compliance Feed */}
          <Card className="p-5 border border-slate-200/70 shadow-xs">
            <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider mb-3">
              Compliance & Customs Status
            </h3>
            <div className="space-y-2.5 text-xs">
              <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100 flex items-start gap-2.5">
                <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <div>
                  <span className="font-extrabold text-slate-900 block">EU Phytosanitary Clearance</span>
                  <span className="text-[10.5px] font-semibold text-slate-500">Batch #8812 approved by Warsaw Inspection.</span>
                </div>
              </div>
              <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100 flex items-start gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                <div>
                  <span className="font-extrabold text-slate-900 block">Bill of Lading #BL-9920 Signed</span>
                  <span className="text-[10.5px] font-semibold text-slate-500">Maersk Line vessel departure confirmed.</span>
                </div>
              </div>
            </div>
          </Card>

        </div>

      </div>
    </div>
  );
};
