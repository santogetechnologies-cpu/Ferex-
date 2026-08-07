import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import {
  Code, Smartphone, Palette, Megaphone, Search as SearchIcon, Award,
  ArrowRight, CheckCircle2, Users
} from 'lucide-react';
import { Card } from '../../components/Card';

export interface ServiceCardData {
  id: string;
  name: string;
  route: string;
  icon: any;
  desc: string;
  activeProjects: number;
  team: string[];
  startingPrice: string;
  timeline: string;
  status: 'Active' | 'Popular' | 'High Demand';
  badgeColor: string;
  workspaceTitle: string;
}

const SERVICE_SELECTION_CARDS: ServiceCardData[] = [
  {
    id: 'SVC-WEB',
    name: 'Website Development',
    route: '/digital/services/web-development',
    icon: Code,
    desc: 'High-performance React & Next.js 14 web portals, server-side rendering, and Vercel edge deployment pipelines.',
    activeProjects: 3,
    team: ['Arun Patel', 'Sneha Roy', 'Vivek Sharma'],
    startingPrice: '₹2,50,000',
    timeline: '4 - 6 Weeks',
    status: 'Popular',
    badgeColor: 'bg-[#6A1B2E]/10 text-[#6A1B2E] border-[#6A1B2E]/20',
    workspaceTitle: 'Software Delivery Workspace',
  },
  {
    id: 'SVC-MOB',
    name: 'Mobile App Development',
    route: '/digital/services/mobile-apps',
    icon: Smartphone,
    desc: 'Native iOS & Android mobile apps built with React Native & Flutter, push notifications, and TestFlight beta releases.',
    activeProjects: 2,
    team: ['Vivek Sharma', 'Arun Patel'],
    startingPrice: '₹3,80,000',
    timeline: '6 - 10 Weeks',
    status: 'High Demand',
    badgeColor: 'bg-purple-50 text-purple-700 border-purple-200',
    workspaceTitle: 'App Development Studio',
  },
  {
    id: 'SVC-UX',
    name: 'UI/UX Design',
    route: '/digital/services/ui-ux-design',
    icon: Palette,
    desc: 'Figma design systems, tokenized UI kits, wireframing sprints, interactive prototypes, and usability testing.',
    activeProjects: 2,
    team: ['Sneha Roy', 'Riya Thomas'],
    startingPrice: '₹1,80,000',
    timeline: '3 - 5 Weeks',
    status: 'Popular',
    badgeColor: 'bg-[#6A1B2E]/10 text-[#6A1B2E] border-[#6A1B2E]/20',
    workspaceTitle: 'Design Studio',
  },
  {
    id: 'SVC-MKT',
    name: 'Digital Marketing',
    route: '/digital/services/digital-marketing',
    icon: Megaphone,
    desc: 'Omnichannel Google Ads, Meta Reels, LinkedIn B2B lead generation campaigns, and ROAS optimization.',
    activeProjects: 3,
    team: ['Riya Thomas', 'Arun Patel'],
    startingPrice: '₹95,000/mo',
    timeline: 'Ongoing Retainer',
    status: 'Active',
    badgeColor: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    workspaceTitle: 'Marketing Command Center',
  },
  {
    id: 'SVC-SEO',
    name: 'SEO & Organic Growth',
    route: '/digital/services/seo',
    icon: SearchIcon,
    desc: 'Technical SEO audits, Google Search Console index status, Core Web Vitals optimization, and Page #1 rank tracking.',
    activeProjects: 2,
    team: ['Riya Thomas', 'Sneha Roy'],
    startingPrice: '₹85,000/mo',
    timeline: 'Ongoing Retainer',
    status: 'High Demand',
    badgeColor: 'bg-purple-50 text-purple-700 border-purple-200',
    workspaceTitle: 'SEO Analytics Center',
  },
  {
    id: 'SVC-BRD',
    name: 'Branding & Identity',
    route: '/digital/services/branding',
    icon: Award,
    desc: 'Corporate logo systems, vector asset vaults, brand guidelines manuals (85+ pages), and collateral mockups.',
    activeProjects: 2,
    team: ['Sneha Roy', 'Arun Patel'],
    startingPrice: '₹2,20,000',
    timeline: '3 - 4 Weeks',
    status: 'Active',
    badgeColor: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    workspaceTitle: 'Creative Brand Studio',
  }
];

export const DigitalServicesHub: React.FC = () => {
  const navigate = useNavigate();
  const [toast, setToast] = useState('');

  const showToastMsg = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(''), 3000);
  };

  return (
    <div className="space-y-8 text-left antialiased select-none">
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

      {/* Hero Header */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-[#6A1B2E] via-[#521221] to-[#3B0B16] text-white p-8 md:p-10 shadow-xl">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-3 max-w-2xl">
            <div className="flex items-center gap-2">
              <span className="text-[10px] uppercase font-black tracking-widest bg-white/15 backdrop-blur-md px-3 py-1 rounded-full border border-white/20 text-white">
                Ferex Digital Service Selection Hub
              </span>
            </div>
            <h1 className="text-2xl md:text-4xl font-black tracking-tight text-white">
              Enterprise Service Workspaces
            </h1>
            <p className="text-xs md:text-sm text-white/85 leading-relaxed font-semibold">
              Select a service offering below to launch its dedicated enterprise workspace, sprint boards, performance analytics, and delivery tools.
            </p>
          </div>
        </div>
      </div>

      {/* Top Service Catalog Stats Bar */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {[
          { label: 'Total Services', value: '6 Workspaces', color: 'text-[#6A1B2E]' },
          { label: 'Active Projects', value: '14 Active', color: 'text-blue-600' },
          { label: 'Completed YTD', value: '128 Delivered', color: 'text-emerald-600' },
          { label: 'YTD Revenue (₹)', value: '₹1.82 Crore', color: 'text-purple-600' },
          { label: 'Client NPS Score', value: '99.2%', color: 'text-amber-600' },
          { label: 'Avg Delivery Time', value: '18 Days', color: 'text-slate-900' },
        ].map((stat, idx) => (
          <Card key={idx} className="p-4 border border-slate-200/70 shadow-2xs text-center">
            <span className="text-[9.5px] font-black uppercase text-slate-400 block mb-1">{stat.label}</span>
            <div className={`text-base font-black ${stat.color}`}>{stat.value}</div>
          </Card>
        ))}
      </div>

      {/* 6 Large Premium Interactive Service Selection Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {SERVICE_SELECTION_CARDS.map(svc => {
          const IconComp = svc.icon;
          return (
            <motion.div
              key={svc.id}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2 }}
            >
              <Card className="p-6 border border-slate-200/80 rounded-2xl shadow-xs hover:shadow-xl hover:-translate-y-1.5 hover:border-[#6A1B2E]/40 transition-all duration-300 flex flex-col justify-between h-full group relative overflow-hidden bg-white">
                {/* Top Maroon Hover Accent Glow */}
                <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-[#6A1B2E] to-[#9B3A50] opacity-0 group-hover:opacity-100 transition-opacity" />

                <div className="space-y-4">
                  {/* Header: Icon + Status */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="w-12 h-12 rounded-2xl bg-[#6A1B2E]/10 text-[#6A1B2E] group-hover:bg-[#6A1B2E] group-hover:text-white flex items-center justify-center transition-all duration-300 shrink-0 shadow-2xs">
                      <IconComp className="w-6 h-6 transition-transform group-hover:scale-110" />
                    </div>
                    <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold border ${svc.badgeColor}`}>
                      {svc.status}
                    </span>
                  </div>

                  {/* Service Title & Desc */}
                  <div>
                    <h3 className="text-base font-black text-slate-900 group-hover:text-[#6A1B2E] transition-colors">
                      {svc.name}
                    </h3>
                    <p className="text-xs font-semibold text-slate-500 mt-1.5 leading-relaxed">
                      {svc.desc}
                    </p>
                  </div>

                  {/* Starting Price & Timeline Grid */}
                  <div className="grid grid-cols-2 gap-2 text-xs font-semibold text-slate-600">
                    <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-100">
                      <span className="text-[9.5px] font-extrabold uppercase text-slate-400 block">Starting Price</span>
                      <span className="font-black text-slate-900 text-sm">{svc.startingPrice}</span>
                    </div>
                    <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-100">
                      <span className="text-[9.5px] font-extrabold uppercase text-slate-400 block">Timeline</span>
                      <span className="font-bold text-slate-800">{svc.timeline}</span>
                    </div>
                  </div>

                  {/* Active Projects & Team */}
                  <div className="space-y-2 border-t border-slate-100 pt-3 text-xs font-semibold text-slate-600">
                    <div className="flex items-center justify-between">
                      <span className="flex items-center gap-1.5 text-emerald-700 font-extrabold">
                        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                        {svc.activeProjects} Active Projects
                      </span>
                      <span className="text-[10px] text-[#6A1B2E] font-extrabold">{svc.workspaceTitle}</span>
                    </div>
                    <div className="flex items-center gap-1 text-[11px] text-slate-400 font-bold">
                      <Users className="w-3.5 h-3.5 text-slate-400" />
                      <span>Team: {svc.team.join(', ')}</span>
                    </div>
                  </div>
                </div>

                {/* Open Workspace Action Button */}
                <div className="mt-6 pt-3 border-t border-slate-100">
                  <button
                    onClick={() => {
                      showToastMsg(`Opening ${svc.workspaceTitle}...`);
                      setTimeout(() => {
                        navigate(svc.route);
                      }, 200);
                    }}
                    className="w-full h-10 px-4 rounded-xl bg-[#6A1B2E] hover:bg-[#521221] text-white text-xs font-black transition-all flex items-center justify-center gap-2 cursor-pointer shadow-md shadow-[#6A1B2E]/20"
                  >
                    Open Workspace <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </Card>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
};
