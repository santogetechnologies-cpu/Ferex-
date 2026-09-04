import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  BarChart3, CheckCircle2,
  FileSpreadsheet, FileText, GraduationCap, Globe, Snowflake, Monitor
} from 'lucide-react';
import { Card } from '../../components/Card';
import { Button } from '../../components/Button';

export const CentralReports: React.FC = () => {
  const [toast, setToast] = useState('');
  const [selectedDivision, setSelectedDivision] = useState<string>('All');
  const [timeframe, setTimeframe] = useState<'Q1' | 'Q2' | 'Q3' | 'Annual'>('Annual');

  const showToastMsg = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(''), 3000);
  };

  const handleDownloadPdf = (reportTitle: string) => {
    showToastMsg(`Generating & Exporting: ${reportTitle} (PDF)...`);
  };

  const handleDownloadCsv = (reportTitle: string) => {
    showToastMsg(`Generating & Exporting: ${reportTitle} (CSV)...`);
  };

  return (
    <div className="space-y-6 text-left antialiased">
      {/* Toast Notification */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed top-20 right-8 z-50 bg-[#6A1B2E] text-white text-xs font-bold px-4 py-2.5 rounded-xl shadow-xl flex items-center gap-2 border border-white/20"
          >
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            {toast}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-black text-slate-900 tracking-tight flex items-center gap-2">
              <BarChart3 className="w-6 h-6 text-[#6A1B2E]" /> Executive Intelligence & Financial Reports
            </h1>
            <span className="text-[10px] font-black bg-[#6A1B2E]/10 text-[#6A1B2E] border border-[#6A1B2E]/20 px-2.5 py-0.5 rounded-full">
              4-App Analytics
            </span>
          </div>
          <p className="text-xs font-semibold text-slate-500 mt-1">
            Audited performance reports, P&L statements, conversion funnels, and freight/cold-chain logistics throughput across the enterprise.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl text-xs font-black">
            {(['Q1', 'Q2', 'Q3', 'Annual'] as const).map(tf => (
              <button
                key={tf}
                onClick={() => setTimeframe(tf)}
                className={`px-3 py-1 rounded-lg transition-all cursor-pointer ${
                  timeframe === tf ? 'bg-[#6A1B2E] text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {tf === 'Annual' ? '2026 Annual' : tf}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Cross-Divisional Performance Snapshot Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          {
            title: 'Ferex Education',
            metric: '₹4.82 Cr Revenue',
            sub: '1,480 Students • 94% Visa Success',
            badge: 'Core Division',
            badgeColor: 'bg-rose-50 text-rose-700 border-rose-200',
            icon: GraduationCap,
            color: 'text-rose-600 bg-rose-50 border-rose-100',
          },
          {
            title: 'Global Trade ERP',
            metric: '€1.20M Cleared',
            sub: '24 Cargo Vessels • 98.4% Customs',
            badge: 'International',
            badgeColor: 'bg-indigo-50 text-indigo-700 border-indigo-200',
            icon: Globe,
            color: 'text-indigo-600 bg-indigo-50 border-indigo-100',
          },
          {
            title: 'Rimi Frozen FMCG',
            metric: '₹38.5 L Distributed',
            sub: '12 Cold Hubs • 48 Fleet Units',
            badge: 'Logistics',
            badgeColor: 'bg-cyan-50 text-cyan-700 border-cyan-200',
            icon: Snowflake,
            color: 'text-cyan-600 bg-cyan-50 border-cyan-100',
          },
          {
            title: 'Ferex Digital Agency',
            metric: '₹19.5 L Contracts',
            sub: '38 Active Retainers • 14 Deployments',
            badge: 'Agency & Tech',
            badgeColor: 'bg-emerald-50 text-emerald-700 border-emerald-200',
            icon: Monitor,
            color: 'text-emerald-600 bg-emerald-50 border-emerald-100',
          },
        ].map((stat, idx) => (
          <Card key={idx} className="p-5 border border-slate-200/80 shadow-xs flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-3">
                <div className={`w-10 h-10 rounded-xl border flex items-center justify-center ${stat.color}`}>
                  <stat.icon className="w-5 h-5" />
                </div>
                <span className={`text-[10px] font-black px-2 py-0.5 rounded-full border ${stat.badgeColor}`}>
                  {stat.badge}
                </span>
              </div>
              <h3 className="text-sm font-black text-slate-900">{stat.title}</h3>
              <p className="text-lg font-black text-slate-900 mt-1">{stat.metric}</p>
              <p className="text-[11px] font-semibold text-slate-500 mt-0.5">{stat.sub}</p>
            </div>
          </Card>
        ))}
      </div>

      {/* Available Executive Report Decks */}
      <div className="space-y-4">
        <h2 className="text-sm font-black text-slate-900 uppercase tracking-wider flex items-center gap-2">
          <FileText className="w-4 h-4 text-[#6A1B2E]" /> Ready-to-Generate Executive Audit Reports
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[
            {
              title: 'Consolidated Enterprise P&L Statement',
              division: 'All 4 Divisions',
              desc: 'Comprehensive financial report including revenues, cross-border payments, wire settlements, and operational overheads.',
              format: 'PDF + CSV',
            },
            {
              title: 'Global Trade Letters of Credit & Customs Audit',
              division: 'Global Trade ERP',
              desc: 'Detailed summary of open, settled, and pending LCs, bill of lading compliance, and freight carrier performance.',
              format: 'PDF + CSV',
            },
            {
              title: 'Rimi Cold-Chain & Batch Traceability Report',
              division: 'Rimi Frozen',
              desc: 'Warehouse temperature logs, distributor billing ledger, inventory aging analysis, and batch expiry quality scores.',
              format: 'PDF + CSV',
            },
            {
              title: 'Education Student Intake & University Conversion',
              division: 'Ferex Education',
              desc: 'Application conversion ratios by country (Poland, Germany, Netherlands), NAWA legalizations, and VFS visa turnaround times.',
              format: 'PDF + CSV',
            },
            {
              title: 'Digital Agency Milestone & Client Retainer Audit',
              division: 'Ferex Digital',
              desc: 'Client billing cycles, deliverables milestone completion, sprint velocity, and monthly retainer run rates.',
              format: 'PDF + CSV',
            },
            {
              title: 'Executive Staff SLA & Governance Audit',
              division: 'Central HQ',
              desc: 'Counselor case loads, ticket resolution speed, admin access events, and division operational compliance metrics.',
              format: 'PDF + CSV',
            },
          ].map((rep, idx) => (
            <Card key={idx} className="p-5 border border-slate-200/80 shadow-xs flex flex-col justify-between hover:shadow-md transition-all">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] font-black uppercase tracking-wider bg-slate-100 text-slate-600 px-2.5 py-0.5 rounded-md border border-slate-200/60">
                    {rep.division}
                  </span>
                  <span className="text-[10px] font-bold text-slate-400">
                    {rep.format}
                  </span>
                </div>
                <h3 className="text-sm font-black text-slate-900 mt-2 leading-snug">{rep.title}</h3>
                <p className="text-xs text-slate-500 font-medium mt-1.5 leading-relaxed">{rep.desc}</p>
              </div>

              <div className="pt-4 mt-4 border-t border-slate-100 flex items-center gap-2">
                <Button
                  size="sm"
                  onClick={() => handleDownloadPdf(rep.title)}
                  className="flex-1 bg-[#6A1B2E] hover:bg-[#521221] text-xs font-bold text-white shadow-xs"
                >
                  <FileText className="w-3.5 h-3.5 mr-1" /> PDF
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleDownloadCsv(rep.title)}
                  className="flex-1 text-xs font-bold"
                >
                  <FileSpreadsheet className="w-3.5 h-3.5 mr-1" /> CSV
                </Button>
              </div>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
};
