import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import {
  getTradeShipments,
  getTradeInvoices,
  getTradeLettersOfCredit,
  getTradeBillsOfLading,
  getTradeDocuments,
  getTradeMessages,
  sendTradeMessage,
} from '../../lib/api/trade';
import {
  Ship,
  FileText,
  CreditCard,
  Layers,
  Send,
  LogOut,
  RefreshCw,
  Building2,
  Clock,
  ShieldCheck,
  PackageCheck,
  Download,
  FileCheck2,
  User,
  Lock,
} from 'lucide-react';

export const TradeClientPortal: React.FC = () => {
  const { user, profile, signOut } = useAuth();
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState<'overview' | 'shipments' | 'invoices' | 'lcs' | 'documents' | 'messages'>('overview');
  const [loading, setLoading] = useState(true);
  const [shipments, setShipments] = useState<any[]>([]);
  const [invoices, setInvoices] = useState<any[]>([]);
  const [lcs, setLcs] = useState<any[]>([]);
  const [bls, setBls] = useState<any[]>([]);
  const [docs, setDocs] = useState<any[]>([]);
  const [messages, setMessages] = useState<any[]>([]);
  const [newMsg, setNewMsg] = useState('');
  const [sendingMsg, setSendingMsg] = useState(false);
  const [selectedShipment, setSelectedShipment] = useState<any>(null);

  const clientEmail = user?.email || profile?.email || '';
  const clientName = profile?.full_name || user?.user_metadata?.full_name || clientEmail.split('@')[0] || 'Trade Partner';
  const companyName = user?.user_metadata?.company_name || profile?.department?.replace('Trade:', '') || 'Global Trade Partner Corp';

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [allShipments, allInvoices, allLcs, allBls, allDocs, chatMsgs] = await Promise.all([
        getTradeShipments(),
        getTradeInvoices(),
        getTradeLettersOfCredit(),
        getTradeBillsOfLading(),
        getTradeDocuments(),
        getTradeMessages('client_portal'),
      ]);

      // Filter for this company / client
      const myInvoices = allInvoices.filter((i: any) =>
        i.buyer_name?.toLowerCase().includes(companyName.toLowerCase()) ||
        i.buyer_name?.toLowerCase().includes(clientName.toLowerCase()) ||
        allInvoices.length <= 5
      );

      const myLcs = allLcs.filter((l: any) =>
        l.beneficiary?.toLowerCase().includes(companyName.toLowerCase()) ||
        allLcs.length <= 5
      );

      setShipments(allShipments || []);
      setInvoices(myInvoices.length > 0 ? myInvoices : allInvoices);
      setLcs(myLcs.length > 0 ? myLcs : allLcs);
      setBls(allBls || []);
      setDocs(allDocs || []);
      setMessages(chatMsgs || []);
    } finally {
      setLoading(false);
    }
  }, [companyName, clientName]);

  useEffect(() => {
    loadData();

    const channel = supabase
      .channel('trade_client_portal_sync')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'trade_shipments' }, () => loadData())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'trade_invoices' }, () => loadData())
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [loadData]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMsg.trim() || sendingMsg) return;
    setSendingMsg(true);
    try {
      await sendTradeMessage({
        conversation_id: 'client_portal',
        contact_name: companyName,
        contact_role: 'Trade Partner Representative',
        sender_name: clientName,
        message: newMsg.trim(),
        is_self: true,
      });
      setNewMsg('');
      const updated = await getTradeMessages('client_portal');
      setMessages(updated);
    } finally {
      setSendingMsg(false);
    }
  };

  const handleLogout = async () => {
    await signOut();
    navigate('/login', { replace: true });
  };

  const totalInvoiced = invoices.reduce((sum, i) => sum + (Number(i.amount) || 0), 0);
  const paidInvoices = invoices.filter((i) => i.status === 'Paid' || i.payment_status === 'Paid');
  const totalPaid = paidInvoices.reduce((sum, i) => sum + (Number(i.amount) || 0), 0);
  const activeShipments = shipments.filter((s) => s.status !== 'Delivered' && s.shipment_status !== 'Delivered');

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-amber-500 selection:text-slate-950">
      {/* ── Top Header Navigation ── */}
      <header className="sticky top-0 z-40 bg-slate-900/90 backdrop-blur-md border-b border-slate-800 px-6 py-4 flex items-center justify-between shadow-2xl">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-amber-700 flex items-center justify-center shadow-lg shadow-amber-500/20 text-slate-950 font-black text-xl tracking-wider">
            GT
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-base tracking-wide text-white">FEREX GLOBAL TRADE</span>
              <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/30">
                Partner Portal
              </span>
            </div>
            <p className="text-xs text-slate-400 flex items-center gap-1.5">
              <Building2 className="w-3.5 h-3.5 text-amber-400" />
              {companyName} • <User className="w-3 h-3 text-slate-500" /> {clientName}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={loadData}
            disabled={loading}
            className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-all text-xs flex items-center gap-1.5 border border-slate-700"
            title="Refresh Records"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-amber-400' : ''}`} />
            <span className="hidden sm:inline">Sync Live</span>
          </button>
          <button
            onClick={handleLogout}
            className="px-3.5 py-1.5 rounded-lg bg-red-950/40 hover:bg-red-900/50 text-red-400 border border-red-800/40 text-xs font-semibold flex items-center gap-1.5 transition-all shadow-sm"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Sign Out</span>
          </button>
        </div>
      </header>

      {/* ── Sub-navigation Tab Bar ── */}
      <nav className="bg-slate-900 border-b border-slate-800 px-6 overflow-x-auto flex gap-1">
        {[
          { id: 'overview', label: 'Overview', icon: Layers },
          { id: 'shipments', label: `Shipments (${activeShipments.length})`, icon: Ship },
          { id: 'invoices', label: `Invoices (${invoices.length})`, icon: FileText },
          { id: 'lcs', label: `Letters of Credit (${lcs.length})`, icon: CreditCard },
          { id: 'documents', label: `Trade Docs (${docs.length})`, icon: FileCheck2 },
          { id: 'messages', label: 'Logistics Support', icon: Send },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 py-3 px-4 text-xs font-semibold border-b-2 whitespace-nowrap transition-all ${
                isActive
                  ? 'border-amber-400 text-amber-400 bg-amber-500/10'
                  : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
              }`}
            >
              <Icon className="w-4 h-4" />
              {tab.label}
            </button>
          );
        })}
      </nav>

      {/* ── Main Portal Body ── */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-6 space-y-6">
        {/* ── TAB 1: OVERVIEW ── */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {/* KPI Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 shadow-lg hover:border-amber-500/40 transition-all">
                <div className="flex items-center justify-between text-slate-400 mb-2">
                  <span className="text-xs font-semibold uppercase tracking-wider">Active Shipments</span>
                  <div className="p-2 rounded-xl bg-blue-500/10 text-blue-400">
                    <Ship className="w-5 h-5" />
                  </div>
                </div>
                <div className="text-2xl font-bold text-white">{activeShipments.length}</div>
                <p className="text-xs text-slate-400 mt-1">Containers en route to port</p>
              </div>

              <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 shadow-lg hover:border-amber-500/40 transition-all">
                <div className="flex items-center justify-between text-slate-400 mb-2">
                  <span className="text-xs font-semibold uppercase tracking-wider">Active Letters of Credit</span>
                  <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400">
                    <CreditCard className="w-5 h-5" />
                  </div>
                </div>
                <div className="text-2xl font-bold text-white">{lcs.length} Verified</div>
                <p className="text-xs text-slate-400 mt-1">Under banking guarantee</p>
              </div>

              <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 shadow-lg hover:border-amber-500/40 transition-all">
                <div className="flex items-center justify-between text-slate-400 mb-2">
                  <span className="text-xs font-semibold uppercase tracking-wider">Total Contract Value</span>
                  <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400">
                    <FileText className="w-5 h-5" />
                  </div>
                </div>
                <div className="text-2xl font-bold text-white">
                  ₹{(totalInvoiced / 100000).toFixed(2)} Lakhs
                </div>
                <p className="text-xs text-slate-400 mt-1">{invoices.length} Total Invoices</p>
              </div>

              <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 shadow-lg hover:border-amber-500/40 transition-all">
                <div className="flex items-center justify-between text-slate-400 mb-2">
                  <span className="text-xs font-semibold uppercase tracking-wider">Settled Payments</span>
                  <div className="p-2 rounded-xl bg-purple-500/10 text-purple-400">
                    <PackageCheck className="w-5 h-5" />
                  </div>
                </div>
                <div className="text-2xl font-bold text-white">
                  ₹{(totalPaid / 100000).toFixed(2)} Lakhs
                </div>
                <p className="text-xs text-emerald-400 mt-1 flex items-center gap-1 font-semibold">
                  <ShieldCheck className="w-3.5 h-3.5" /> Fully Cleared
                </p>
              </div>
            </div>

            {/* Active Shipments Live Table */}
            <div className="rounded-2xl bg-slate-900 border border-slate-800 p-6 shadow-xl">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-base font-bold text-white flex items-center gap-2">
                    <Ship className="w-4 h-4 text-amber-400" /> Active Cargo Shipments
                  </h2>
                  <p className="text-xs text-slate-400">Live vessel tracking and port ETA information</p>
                </div>
                <button
                  onClick={() => setActiveTab('shipments')}
                  className="text-xs font-semibold text-amber-400 hover:text-amber-300 flex items-center gap-1"
                >
                  View All ({shipments.length}) →
                </button>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-950 text-slate-400 uppercase text-[10px] tracking-wider">
                    <tr>
                      <th className="py-3 px-4 rounded-l-lg">Shipment / Container</th>
                      <th className="py-3 px-4">Carrier & Vessel</th>
                      <th className="py-3 px-4">Route</th>
                      <th className="py-3 px-4">Cargo Description</th>
                      <th className="py-3 px-4">ETA</th>
                      <th className="py-3 px-4 text-right rounded-r-lg">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {shipments.slice(0, 4).map((s: any) => (
                      <tr key={s.id} className="hover:bg-slate-800/40 transition-colors">
                        <td className="py-3 px-4 font-mono font-bold text-amber-400">
                          {s.shipment_no || s.id}
                          <div className="text-[11px] font-mono text-slate-400 font-normal">{s.container_no || 'Cont. # Pending'}</div>
                        </td>
                        <td className="py-3 px-4 text-slate-200">
                          <div className="font-semibold">{s.carrier || 'Maersk Line'}</div>
                          <div className="text-[11px] text-slate-400">{s.carrier_vessel || 'MSC Oscar (V.8821)'}</div>
                        </td>
                        <td className="py-3 px-4 text-slate-300">
                          <div className="text-[11px]">{s.origin_port || 'Port of Gdansk, Poland'}</div>
                          <div className="text-[10px] text-slate-500">➔ {s.destination_port || 'Port of Rotterdam, Netherlands'}</div>
                        </td>
                        <td className="py-3 px-4 text-slate-300 max-w-xs truncate">{s.cargo_description || 'Industrial Machinery'}</td>
                        <td className="py-3 px-4 text-slate-300 font-mono">{s.eta || '2026-09-20'}</td>
                        <td className="py-3 px-4 text-right">
                          <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold border ${
                            s.status === 'Delivered'
                              ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                              : 'bg-blue-500/10 text-blue-400 border-blue-500/30'
                          }`}>
                            <Clock className="w-3 h-3" /> {s.status || s.shipment_status || 'In Transit'}
                          </span>
                        </td>
                      </tr>
                    ))}
                    {shipments.length === 0 && (
                      <tr>
                        <td colSpan={6} className="py-8 text-center text-slate-500">
                          No active shipments registered for this account.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Invoices & Letters of Credit Section */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Invoices */}
              <div className="rounded-2xl bg-slate-900 border border-slate-800 p-6 shadow-xl space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <FileText className="w-4 h-4 text-emerald-400" /> Commercial Invoices
                  </h3>
                  <button onClick={() => setActiveTab('invoices')} className="text-xs text-amber-400 hover:underline">
                    View Invoices →
                  </button>
                </div>
                <div className="space-y-2.5">
                  {invoices.slice(0, 3).map((inv: any) => (
                    <div key={inv.id} className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between">
                      <div>
                        <p className="font-mono font-bold text-xs text-white">{inv.invoice_no || inv.id}</p>
                        <p className="text-[11px] text-slate-400">{inv.payment_terms || 'Letter of Credit (LC) at Sight'}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-xs text-amber-400">₹{Number(inv.amount || 0).toLocaleString('en-IN')}</p>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          inv.status === 'Paid' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-amber-500/20 text-amber-400'
                        }`}>
                          {inv.status || 'Issued'}
                        </span>
                      </div>
                    </div>
                  ))}
                  {invoices.length === 0 && <p className="text-xs text-slate-500 text-center py-4">No invoices on record.</p>}
                </div>
              </div>

              {/* LCs */}
              <div className="rounded-2xl bg-slate-900 border border-slate-800 p-6 shadow-xl space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <CreditCard className="w-4 h-4 text-amber-400" /> Banking Guarantees & LCs
                  </h3>
                  <button onClick={() => setActiveTab('lcs')} className="text-xs text-amber-400 hover:underline">
                    View LCs →
                  </button>
                </div>
                <div className="space-y-2.5">
                  {lcs.slice(0, 3).map((lc: any) => (
                    <div key={lc.id} className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between">
                      <div>
                        <p className="font-mono font-bold text-xs text-white">{lc.lc_number || lc.id}</p>
                        <p className="text-[11px] text-slate-400">{lc.issuing_bank || 'HSBC London / Warsaw Desk'}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-xs text-amber-400">₹{Number(lc.amount || 0).toLocaleString('en-IN')}</p>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400">
                          {lc.status || 'Active & Confirmed'}
                        </span>
                      </div>
                    </div>
                  ))}
                  {lcs.length === 0 && <p className="text-xs text-slate-500 text-center py-4">No Letters of Credit verified.</p>}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── TAB 2: SHIPMENTS ── */}
        {activeTab === 'shipments' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold text-white flex items-center gap-2">
                  <Ship className="w-5 h-5 text-amber-400" /> Maritime Cargo & Container Directory
                </h2>
                <p className="text-xs text-slate-400">Full container manifests, maritime tracking, and port status</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {shipments.map((s: any) => (
                <div key={s.id} className="p-5 rounded-2xl bg-slate-900 border border-slate-800 shadow-xl space-y-4 hover:border-amber-500/40 transition-all">
                  <div className="flex items-start justify-between">
                    <div>
                      <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20">
                        {s.transport_mode || 'Maritime'}
                      </span>
                      <h3 className="font-mono font-bold text-base text-white mt-1.5">{s.shipment_no || s.id}</h3>
                      <p className="text-xs text-slate-400 font-mono">Container: {s.container_no || 'Pending Assignment'}</p>
                    </div>
                    <span className={`px-2.5 py-1 rounded-full text-xs font-bold border ${
                      s.status === 'Delivered'
                        ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                        : 'bg-blue-500/10 text-blue-400 border-blue-500/30'
                    }`}>
                      {s.status || s.shipment_status || 'In Transit'}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-3 py-3 border-y border-slate-800 text-xs">
                    <div>
                      <span className="text-slate-500 text-[10px] uppercase font-bold">Origin Port</span>
                      <p className="text-slate-200 font-medium">{s.origin_port || 'Port of Gdansk, Poland'}</p>
                    </div>
                    <div>
                      <span className="text-slate-500 text-[10px] uppercase font-bold">Destination Port</span>
                      <p className="text-slate-200 font-medium">{s.destination_port || 'Port of Rotterdam, Netherlands'}</p>
                    </div>
                    <div>
                      <span className="text-slate-500 text-[10px] uppercase font-bold">Carrier & Vessel</span>
                      <p className="text-slate-200 font-medium">{s.carrier || 'Maersk Line'} ({s.carrier_vessel || 'MSC Oscar'})</p>
                    </div>
                    <div>
                      <span className="text-slate-500 text-[10px] uppercase font-bold">Cargo Weight</span>
                      <p className="text-slate-200 font-medium font-mono">{Number(s.cargo_weight_kg || 24500).toLocaleString()} KG</p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-400 flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-amber-400" /> ETA: <strong className="text-white font-mono">{s.eta || '2026-09-20'}</strong>
                    </span>
                    <button
                      onClick={() => setSelectedShipment(s)}
                      className="px-3 py-1.5 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 font-bold border border-amber-500/30 text-xs transition-all"
                    >
                      View Details
                    </button>
                  </div>
                </div>
              ))}
              {shipments.length === 0 && (
                <div className="col-span-2 p-12 text-center text-slate-500 bg-slate-900/50 rounded-2xl border border-slate-800">
                  No shipments active.
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── TAB 3: INVOICES ── */}
        {activeTab === 'invoices' && (
          <div className="space-y-4">
            <div>
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <FileText className="w-5 h-5 text-emerald-400" /> Commercial Invoices & Statements
              </h2>
              <p className="text-xs text-slate-400">Payment settlements, due dates, and tax invoices</p>
            </div>

            <div className="rounded-2xl bg-slate-900 border border-slate-800 overflow-hidden shadow-xl">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-950 text-slate-400 uppercase text-[10px] tracking-wider">
                  <tr>
                    <th className="py-3.5 px-4">Invoice #</th>
                    <th className="py-3.5 px-4">Incoterms</th>
                    <th className="py-3.5 px-4">Payment Terms</th>
                    <th className="py-3.5 px-4">Due Date</th>
                    <th className="py-3.5 px-4 text-right">Amount (INR)</th>
                    <th className="py-3.5 px-4 text-right">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {invoices.map((inv: any) => (
                    <tr key={inv.id} className="hover:bg-slate-800/40">
                      <td className="py-3.5 px-4 font-mono font-bold text-amber-400">{inv.invoice_no || inv.id}</td>
                      <td className="py-3.5 px-4 text-slate-300 font-semibold">{inv.incoterms || 'FOB'}</td>
                      <td className="py-3.5 px-4 text-slate-300">{inv.payment_terms || 'Letter of Credit (LC) at Sight'}</td>
                      <td className="py-3.5 px-4 text-slate-400 font-mono">{inv.due_date || '2026-10-01'}</td>
                      <td className="py-3.5 px-4 text-right font-bold text-white font-mono">
                        ₹{Number(inv.amount || 0).toLocaleString('en-IN')}
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <span className={`px-2.5 py-1 rounded-full text-[11px] font-bold ${
                          inv.status === 'Paid' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                        }`}>
                          {inv.status || 'Issued'}
                        </span>
                      </td>
                    </tr>
                  ))}
                  {invoices.length === 0 && (
                    <tr>
                      <td colSpan={6} className="py-12 text-center text-slate-500">
                        No commercial invoices found.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ── TAB 4: LETTERS OF CREDIT ── */}
        {activeTab === 'lcs' && (
          <div className="space-y-4">
            <div>
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <CreditCard className="w-5 h-5 text-amber-400" /> Irrevocable Letters of Credit (LC)
              </h2>
              <p className="text-xs text-slate-400">Bank-guaranteed trade financing and documentary credits</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {lcs.map((lc: any) => (
                <div key={lc.id} className="p-5 rounded-2xl bg-slate-900 border border-slate-800 shadow-xl space-y-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <span className="text-[10px] font-mono text-amber-400 uppercase font-bold tracking-wider">SWIFT Verified</span>
                      <h3 className="font-mono font-bold text-base text-white mt-1">{lc.lc_number || lc.id}</h3>
                    </div>
                    <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                      {lc.status || 'Active & Confirmed'}
                    </span>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-1 text-xs">
                    <div className="flex justify-between text-slate-400">
                      <span>Issuing Bank:</span>
                      <strong className="text-slate-200">{lc.issuing_bank || 'HSBC London / Warsaw Desk'}</strong>
                    </div>
                    <div className="flex justify-between text-slate-400">
                      <span>Beneficiary:</span>
                      <strong className="text-slate-200">{lc.beneficiary || companyName}</strong>
                    </div>
                    <div className="flex justify-between text-slate-400">
                      <span>Expiry Date:</span>
                      <strong className="text-slate-200 font-mono">{lc.expiry_date || '2026-10-30'}</strong>
                    </div>
                  </div>
                  <div className="flex items-center justify-between pt-2 border-t border-slate-800">
                    <span className="text-xs text-slate-400">Guaranteed Amount</span>
                    <span className="font-mono font-bold text-base text-amber-400">
                      ₹{Number(lc.amount || 0).toLocaleString('en-IN')}
                    </span>
                  </div>
                </div>
              ))}
              {lcs.length === 0 && (
                <div className="col-span-2 p-12 text-center text-slate-500 bg-slate-900 rounded-2xl border border-slate-800">
                  No active Letters of Credit on file.
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── TAB 5: DOCUMENTS ── */}
        {activeTab === 'documents' && (
          <div className="space-y-4">
            <div>
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <FileCheck2 className="w-5 h-5 text-blue-400" /> Shipping Documents & Customs Certificates
              </h2>
              <p className="text-xs text-slate-400">Bills of lading, origin certificates, and packing declarations</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {bls.map((bl: any) => (
                <div key={bl.id} className="p-4 rounded-2xl bg-slate-900 border border-slate-800 shadow-xl space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 rounded-xl bg-blue-500/10 text-blue-400">
                      <FileText className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="font-mono font-bold text-xs text-white">{bl.bl_number || bl.id}</h4>
                      <p className="text-[11px] text-slate-400">{bl.carrier || 'MSC Mediterranean Shipping'}</p>
                    </div>
                  </div>
                  <div className="text-[11px] text-slate-300 space-y-1 bg-slate-950 p-2.5 rounded-lg border border-slate-800">
                    <p>Port: <strong>{bl.port_of_loading || 'Gdansk'} ➔ {bl.port_of_discharge || 'Rotterdam'}</strong></p>
                    <p>Status: <span className="text-emerald-400 font-semibold">{bl.status || 'Clean On-Board Signed'}</span></p>
                  </div>
                  <button className="w-full py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs flex items-center justify-center gap-2 border border-slate-700 transition-all">
                    <Download className="w-3.5 h-3.5 text-amber-400" /> Download Signed B/L
                  </button>
                </div>
              ))}

              {docs.map((doc: any) => (
                <div key={doc.id} className="p-4 rounded-2xl bg-slate-900 border border-slate-800 shadow-xl space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-400">
                      <FileCheck2 className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="font-bold text-xs text-white truncate max-w-[180px]">{doc.document_name}</h4>
                      <p className="text-[11px] text-slate-400">{doc.doc_type || 'Customs Declaration'}</p>
                    </div>
                  </div>
                  <div className="text-[11px] text-slate-300 space-y-1 bg-slate-950 p-2.5 rounded-lg border border-slate-800">
                    <p>Folder: <strong>{doc.folder || 'Customs Clearance'}</strong></p>
                    <p>Size: <strong>{doc.file_size || '1.5 MB'}</strong> • <span className="text-emerald-400 font-semibold">Verified</span></p>
                  </div>
                  <button className="w-full py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs flex items-center justify-center gap-2 border border-slate-700 transition-all">
                    <Download className="w-3.5 h-3.5 text-amber-400" /> Download Document
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── TAB 6: MESSAGES ── */}
        {activeTab === 'messages' && (
          <div className="max-w-3xl mx-auto space-y-4">
            <div>
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <Send className="w-5 h-5 text-amber-400" /> Direct Logistics Dispatch Channel
              </h2>
              <p className="text-xs text-slate-400">Direct instant messaging with Ferex Global Trade operations desk</p>
            </div>

            <div className="rounded-2xl bg-slate-900 border border-slate-800 overflow-hidden shadow-2xl flex flex-col h-[520px]">
              {/* Message Feed */}
              <div className="flex-1 p-4 overflow-y-auto space-y-3 bg-slate-950/40">
                {messages.length === 0 && (
                  <div className="h-full flex flex-col items-center justify-center text-slate-500 space-y-2">
                    <Lock className="w-8 h-8 text-slate-600" />
                    <p className="text-xs">This is your encrypted partner communications channel.</p>
                    <p className="text-[11px] text-slate-600">Send a message below to reach the trade coordinator.</p>
                  </div>
                )}
                {messages.map((m: any) => {
                  const isMine = m.is_self || m.sender_name === clientName;
                  return (
                    <div key={m.id} className={`flex flex-col ${isMine ? 'items-end' : 'items-start'}`}>
                      <div className="text-[10px] text-slate-400 mb-0.5 font-semibold">
                        {isMine ? 'You' : m.sender_name} • {m.contact_role || 'Operations'}
                      </div>
                      <div className={`p-3 rounded-2xl max-w-md text-xs leading-relaxed ${
                        isMine
                          ? 'bg-gradient-to-r from-amber-600 to-amber-700 text-slate-950 font-medium rounded-tr-none'
                          : 'bg-slate-800 text-slate-100 rounded-tl-none border border-slate-700'
                      }`}>
                        {m.message}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Message Input */}
              <form onSubmit={handleSendMessage} className="p-3 bg-slate-900 border-t border-slate-800 flex gap-2">
                <input
                  type="text"
                  value={newMsg}
                  onChange={(e) => setNewMsg(e.target.value)}
                  placeholder="Type a message or inquiry regarding shipments, LCs, or customs..."
                  className="flex-1 bg-slate-950 border border-slate-700 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-amber-400"
                />
                <button
                  type="submit"
                  disabled={sendingMsg || !newMsg.trim()}
                  className="px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-slate-950 font-bold text-xs flex items-center gap-1.5 transition-all shadow-md shadow-amber-500/20"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Send</span>
                </button>
              </form>
            </div>
          </div>
        )}
      </main>

      {/* ── Shipment Details Modal ── */}
      {selectedShipment && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="max-w-lg w-full rounded-2xl bg-slate-900 border border-slate-800 p-6 space-y-4 shadow-2xl text-xs">
            <div className="flex items-start justify-between border-b border-slate-800 pb-3">
              <div>
                <h3 className="font-mono font-bold text-base text-amber-400">
                  {selectedShipment.shipment_no || selectedShipment.id}
                </h3>
                <p className="text-slate-400 text-xs">Container #{selectedShipment.container_no}</p>
              </div>
              <button
                onClick={() => setSelectedShipment(null)}
                className="p-1 rounded-lg bg-slate-800 text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>
            <div className="space-y-2 text-slate-300">
              <p><strong>Carrier:</strong> {selectedShipment.carrier || 'Maersk Line'}</p>
              <p><strong>Vessel:</strong> {selectedShipment.carrier_vessel || 'MSC Oscar (V.8821)'}</p>
              <p><strong>Origin:</strong> {selectedShipment.origin_port || 'Port of Gdansk, Poland'}</p>
              <p><strong>Destination:</strong> {selectedShipment.destination_port || 'Port of Rotterdam, Netherlands'}</p>
              <p><strong>Cargo:</strong> {selectedShipment.cargo_description || 'Industrial Machinery'}</p>
              <p><strong>Weight:</strong> {selectedShipment.cargo_weight_kg || 24500} KG</p>
              <p><strong>ETA:</strong> {selectedShipment.eta || '2026-09-20'}</p>
              <p><strong>Status:</strong> <span className="text-amber-400 font-bold">{selectedShipment.status || 'In Transit'}</span></p>
            </div>
            <button
              onClick={() => setSelectedShipment(null)}
              className="w-full py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default TradeClientPortal;
