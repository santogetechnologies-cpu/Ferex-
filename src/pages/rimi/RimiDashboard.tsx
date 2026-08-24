import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import {
  ShoppingCart, Package, Warehouse, Truck, DollarSign,
  AlertTriangle, ArrowUpRight, CheckCircle2, Clock, Thermometer,
  Boxes
} from 'lucide-react';
import { Card } from '../../components/Card';

export const RimiDashboard: React.FC = () => {
  const navigate = useNavigate();
  const [toast] = useState('');

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

      {/* FMCG Cold Chain Hero Banner */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-[#6A1B2E] via-[#521221] to-[#3B0B16] text-white p-6 md:p-8 shadow-xl border border-[#6A1B2E]/30">
        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-2 max-w-2xl">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[10px] uppercase font-black tracking-widest bg-white/15 backdrop-blur-md px-3 py-1 rounded-full border border-white/20 text-white">
                FMCG Executive ERP Console
              </span>
              <span className="text-[10px] font-extrabold text-emerald-300 bg-emerald-500/20 px-2.5 py-1 rounded-full border border-emerald-400/30 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" /> Cold Storage Monitoring Active (-22°C)
              </span>
            </div>
            <h1 className="text-2xl md:text-3xl font-black tracking-tight text-white">
              Rimi Frozen Distribution Hub
            </h1>
            <p className="text-xs md:text-sm text-white/85 leading-relaxed font-semibold">
              Managing regional frozen food logistics, supermarket reefer supply chains, temperature-controlled warehouses, and batch expiration telemetry.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3 shrink-0">
            <button
              onClick={() => navigate('/rimi/sales-orders')}
              className="h-10 px-5 rounded-xl text-xs font-black text-[#6A1B2E] bg-white hover:bg-slate-100 transition-all shadow-md flex items-center gap-2 cursor-pointer"
            >
              Dispatch New Sales Order <ArrowUpRight className="w-4 h-4" />
            </button>
            <button
              onClick={() => navigate('/rimi/expiry-tracking')}
              className="h-10 px-5 rounded-xl text-xs font-black text-white bg-white/15 hover:bg-white/25 border border-white/30 transition-all shadow-xs cursor-pointer"
            >
              View Expiry Risk Monitor
            </button>
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { title: 'Today Sales Revenue', value: '₹2,84,500', sub: '142 Orders Dispatched Today', icon: DollarSign, color: 'text-emerald-600 bg-emerald-50 border-emerald-100', badge: '+12.4% vs Target', path: '/rimi/orders' },
          { title: 'Monthly Revenue', value: '₹84,20,000', sub: 'Q3 Forecast Target ₹92 Lakhs', icon: ShoppingCart, color: 'text-[#6A1B2E] bg-[#6A1B2E]/10 border-[#6A1B2E]/20', badge: 'Active Growth', path: '/rimi/reports' },
          { title: 'Cold Storage Stock', value: '18,450 Units', sub: '3 Temperature Warehouses', icon: Boxes, color: 'text-blue-600 bg-blue-50 border-blue-100', badge: '-22°C Locked', path: '/rimi/inventory' },
          { title: 'Reefer Fleet Status', value: '14 Trucks Active', sub: '0 Temperature Alerts Logged', icon: Truck, color: 'text-indigo-600 bg-indigo-50 border-indigo-100', badge: '100% On-Time', path: '/rimi/fleet' },
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

      {/* Main Workspace Layout Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left 2 Cols: Sales Revenue Chart & Cold Storage Telemetry */}
        <div className="lg:col-span-2 space-y-6">
          {/* Sales Revenue Trend Chart */}
          <Card className="p-6 text-left border border-slate-200/70 shadow-xs">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-5">
              <div>
                <h3 className="text-sm font-black text-slate-900">Daily Sales Turnover & Reefer Volume (₹)</h3>
                <p className="text-xs text-slate-400 font-semibold mt-0.5">Frozen Food revenue trend across Supermarkets & Distributors</p>
              </div>
              <span className="text-[10px] font-extrabold text-[#6A1B2E] bg-[#6A1B2E]/10 px-3 py-1 rounded-full uppercase border border-[#6A1B2E]/20">
                Avg Daily: ₹2.85 Lakhs
              </span>
            </div>

            {/* SVG Area Chart */}
            <div className="h-[210px] w-full relative">
              <svg className="w-full h-full" viewBox="0 0 500 200" preserveAspectRatio="none">
                <defs>
                  <linearGradient id="rimi-grad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#6A1B2E" stopOpacity="0.22" />
                    <stop offset="100%" stopColor="#6A1B2E" stopOpacity="0.0" />
                  </linearGradient>
                </defs>
                <line x1="0" y1="40" x2="500" y2="40" stroke="#f1f5f9" strokeWidth="1" />
                <line x1="0" y1="90" x2="500" y2="90" stroke="#f1f5f9" strokeWidth="1" />
                <line x1="0" y1="140" x2="500" y2="140" stroke="#f1f5f9" strokeWidth="1" />
                
                <path d="M 0 160 Q 100 120, 200 130 T 400 60 T 500 35 L 500 200 L 0 200 Z" fill="url(#rimi-grad)" />
                <path d="M 0 160 Q 100 120, 200 130 T 400 60 T 500 35" fill="none" stroke="#6A1B2E" strokeWidth="3.5" strokeLinecap="round" />
                <circle cx="200" cy="130" r="5" fill="#6A1B2E" stroke="white" strokeWidth="2" />
                <circle cx="400" cy="60" r="5" fill="#6A1B2E" stroke="white" strokeWidth="2" />
              </svg>
              <div className="absolute top-[40px] left-[340px] bg-slate-900 text-white text-[9px] font-bold px-2.5 py-1 rounded shadow-md pointer-events-none select-none">
                Peak Sales: ₹3.40 Lakhs
              </div>
            </div>

            <div className="flex items-center justify-between text-[10px] font-bold text-slate-400 mt-2 px-1 select-none">
              <span>Mon</span>
              <span>Tue</span>
              <span>Wed</span>
              <span>Thu</span>
              <span>Fri</span>
              <span>Sat (Today)</span>
            </div>
          </Card>

          {/* Cold Storage Warehouse Telemetry */}
          <Card className="p-6 text-left border border-slate-200/70 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
                <Thermometer className="w-4 h-4 text-[#6A1B2E]" /> Temperature Controlled Warehouses
              </h3>
              <button onClick={() => navigate('/rimi/warehouses')} className="text-xs font-bold text-[#6A1B2E] hover:underline">
                View All Cold Hubs
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {[
                { name: 'Mumbai Central Hub', temp: '-22.4°C', capacity: '88% Full', status: 'Optimal Frozen' },
                { name: 'Delhi NCR Cold Logistics', temp: '-20.1°C', capacity: '74% Full', status: 'Optimal Frozen' },
                { name: 'Bengaluru Reefer Depot', temp: '-19.8°C', capacity: '62% Full', status: 'Optimal Frozen' },
              ].map((w, idx) => (
                <div key={idx} className="p-3.5 bg-slate-50 rounded-xl border border-slate-100 space-y-1">
                  <div className="text-[10px] font-black uppercase text-slate-400">{w.name}</div>
                  <div className="text-base font-black text-slate-900 flex items-center gap-1.5">
                    <Thermometer className="w-4 h-4 text-blue-600" /> {w.temp}
                  </div>
                  <div className="flex items-center justify-between pt-1">
                    <span className="text-[9px] font-extrabold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">{w.status}</span>
                    <span className="text-[10px] font-bold text-slate-500">{w.capacity}</span>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>

        {/* Right Col: Quick Actions, Low Stock Alerts, Expiry Warnings */}
        <div className="space-y-6 text-left">
          
          {/* Quick Action Cards */}
          <Card className="p-5 border border-slate-200/70 shadow-xs">
            <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider mb-3">
              Distribution Quick Actions
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {[
                { title: 'Sales Orders', path: '/rimi/sales-orders', icon: ShoppingCart },
                { title: 'Product Catalog', path: '/rimi/products', icon: Package },
                { title: 'Cold Warehouses', path: '/rimi/warehouses', icon: Warehouse },
                { title: 'Reefer Deliveries', path: '/rimi/deliveries', icon: Truck },
                { title: 'Expiry Tracking', path: '/rimi/expiry-tracking', icon: Clock },
                { title: 'Collections', path: '/rimi/collections', icon: DollarSign },
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

          {/* Expiry Risk & Low Stock Feed */}
          <Card className="p-5 border-l-4 border-l-amber-500 border-slate-200/70 shadow-xs space-y-3">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                <AlertTriangle className="w-4 h-4 text-amber-500" /> Stock & Expiry Telemetry
              </h3>
              <button onClick={() => navigate('/rimi/expiry-tracking')} className="text-[10px] font-bold text-[#6A1B2E] hover:underline">
                View All
              </button>
            </div>

            <div className="space-y-2 text-xs">
              <div className="p-2.5 rounded-xl bg-amber-50 border border-amber-100 flex items-start gap-2.5">
                <Clock className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <span className="font-extrabold text-amber-950 block">Batch #FZN-8812 Expiring in 18 Days</span>
                  <span className="text-[10.5px] font-semibold text-amber-700">Frozen Pork Ribs (450 Units in Mumbai Hub)</span>
                </div>
              </div>

              <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100 flex items-start gap-2.5">
                <Package className="w-4 h-4 text-[#6A1B2E] shrink-0 mt-0.5" />
                <div>
                  <span className="font-extrabold text-slate-900 block">Low Stock Alert: Gourmet Vanilla Ice Cream</span>
                  <span className="text-[10.5px] font-semibold text-slate-500">Stock level at 85 Packs (Reorder threshold: 100)</span>
                </div>
              </div>
            </div>
          </Card>

        </div>

      </div>
    </div>
  );
};
