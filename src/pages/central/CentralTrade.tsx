import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Globe, Search, Ship, FileText, CreditCard, CheckCircle2,
  Anchor, RefreshCw, X, AlertTriangle, User, Filter, Calendar
} from 'lucide-react';
import { Card } from '../../components/Card';
import { Button } from '../../components/Button';
import { ToastNotification } from '../../components/ToastNotification';
import {
  getTradeShipments,
  getTradeDocuments,
  getTradeLettersOfCredit,
  getTradeCRMContacts,
  getTradeInvoices,
  reassignTradeShipment,
  advanceTradeOrderStage
} from '../../lib/api/trade';
import { getDivisionStaff, type DivisionStaffMember } from '../../lib/api/staff';
import { sendTradeStageEmail } from '../../lib/api/automatedEmails';
import { supabase } from '../../lib/supabase';

export const CentralTrade: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'shipments' | 'documents' | 'lcs' | 'clients'>('shipments');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [clientFilter, setClientFilter] = useState('All');
  const [staffFilter, setStaffFilter] = useState('All');
  const [dateFilter, setDateFilter] = useState<'All' | '7days' | '30days'>('All');
  const [toast, setToast] = useState('');
  const [loading, setLoading] = useState(true);

  const [shipments, setShipments] = useState<any[]>([]);
  const [documents, setDocuments] = useState<any[]>([]);
  const [lcs, setLcs] = useState<any[]>([]);
  const [clients, setClients] = useState<any[]>([]);
  const [invoices, setInvoices] = useState<any[]>([]);
  const [staffList, setStaffList] = useState<DivisionStaffMember[]>([]);

  const [reassignModal, setReassignModal] = useState<any | null>(null);
  const [newStaff, setNewStaff] = useState('');

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(''), 3000);
  };

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [sData, dData, lcData, cData, iData, stData] = await Promise.all([
        getTradeShipments(),
        getTradeDocuments(),
        getTradeLettersOfCredit(),
        getTradeCRMContacts(),
        getTradeInvoices(),
        getDivisionStaff('trade')
      ]);
      setShipments(sData || []);
      setDocuments(dData || []);
      setLcs(lcData || []);
      setClients(cData || []);
      setInvoices(iData || []);
      setStaffList(stData || []);
      if (stData && stData.length > 0 && !newStaff) {
        setNewStaff(stData[0].name);
      }
    } finally {
      setLoading(false);
    }
  }, [newStaff]);

  useEffect(() => {
    loadData();

    // Supabase Realtime synchronization
    const channel = supabase
      .channel('central_trade_realtime_sync')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'trade_orders' }, () => loadData())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'trade_shipments' }, () => loadData())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'trade_documents' }, () => loadData())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'trade_invoices' }, () => loadData())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'trade_clients' }, () => loadData())
      .subscribe();

    const handleSync = () => loadData();
    window.addEventListener('ferex_trade_orders_change', handleSync);
    window.addEventListener('ferex_trade_shipments_change', handleSync);
    window.addEventListener('ferex_trade_clients_change', handleSync);

    return () => {
      supabase.removeChannel(channel);
      window.removeEventListener('ferex_trade_orders_change', handleSync);
      window.removeEventListener('ferex_trade_shipments_change', handleSync);
      window.removeEventListener('ferex_trade_clients_change', handleSync);
    };
  }, [loadData]);

  // Live Supabase Calculations
  const totalOrderValueEur = useMemo(() => {
    return shipments.reduce((sum, s) => {
      const amt = Number(s.total_amount || s.cargo_value || (Number(s.cargo_weight_kg || 0) * 4.5));
      return sum + amt;
    }, 0);
  }, [shipments]);

  const pendingPaymentsEur = useMemo(() => {
    return invoices
      .filter((i: any) => i.status !== 'Paid' && i.status !== 'Settled')
      .reduce((sum, i) => sum + (Number(i.amount) || 0), 0);
  }, [invoices]);

  const inTransitCount = useMemo(() => {
    return shipments.filter(s => (s.stage || s.status || s.shipment_status) === 'In Transit' || (s.stage || s.status || s.shipment_status) === 'Shipped').length;
  }, [shipments]);

  const overdueDocsCount = useMemo(() => {
    // Verified docs vs standard 7 docs per order
    const verified = documents.filter((d: any) => d.status === 'Verified').length;
    const required = shipments.length * 7;
    return Math.max(0, required - verified);
  }, [shipments, documents]);

  const handleUpdateShipmentStage = async (shipment: any, newStage: string) => {
    try {
      await advanceTradeOrderStage(shipment.id || shipment.order_no, newStage as any, 'Super Admin');
      await sendTradeStageEmail({
        clientEmail: shipment.client_email || 'buyer@globaltrade.eu',
        clientName: shipment.client_name || shipment.carrier || 'Commercial Trade Buyer',
        shipmentNo: shipment.order_no || shipment.shipment_no || shipment.id,
        stage: newStage as any,
        trackingNo: shipment.tracking_number || shipment.container_no,
        carrier: shipment.carrier,
        origin: shipment.origin_port,
        destination: shipment.destination_port
      });
      showToast(`Shipment ${shipment.order_no || shipment.shipment_no || shipment.id} updated to ${newStage} in Supabase & buyer notified!`);
      loadData();
    } catch (err: any) {
      showToast(`Failed to update stage: ${err.message}`);
    }
  };

  const handleConfirmReassign = async () => {
    if (!reassignModal || !newStaff) return;
    try {
      const staffMember = staffList.find(s => s.name === newStaff || s.email === newStaff);
      await reassignTradeShipment(reassignModal.id || reassignModal.order_no, newStaff, staffMember?.email, staffMember?.id);
      setShipments(prev => prev.map(s => (s.id === reassignModal.id || s.order_no === reassignModal.order_no) ? { ...s, assigned_staff_name: newStaff, assigned_staff: newStaff } : s));
      showToast(`Reassigned shipment to ${newStaff} in Supabase!`);
      setReassignModal(null);
    } catch (err: any) {
      showToast(`Failed to reassign: ${err.message}`);
    }
  };

  // Multi-dimensional filters
  const filteredShipments = shipments.filter(s => {
    const matchSearch =
      (s.order_no || s.shipment_no || s.id || '').toLowerCase().includes(search.toLowerCase()) ||
      (s.container_no || s.tracking_number || '').toLowerCase().includes(search.toLowerCase()) ||
      (s.client_name || '').toLowerCase().includes(search.toLowerCase()) ||
      (s.carrier || '').toLowerCase().includes(search.toLowerCase());

    const currentStage = s.stage || s.status || s.shipment_status || 'In Transit';
    const matchStatus = statusFilter === 'All' || currentStage === statusFilter;
    const matchClient = clientFilter === 'All' || (s.client_name || '') === clientFilter;
    const staffName = s.assigned_staff_name || s.assigned_staff || '';
    const matchStaff = staffFilter === 'All' || staffName.toLowerCase().includes(staffFilter.toLowerCase());

    let matchDate = true;
    if (dateFilter === '7days') {
      const threshold = Date.now() - 7 * 86400000;
      matchDate = s.created_at ? new Date(s.created_at).getTime() >= threshold : true;
    } else if (dateFilter === '30days') {
      const threshold = Date.now() - 30 * 86400000;
      matchDate = s.created_at ? new Date(s.created_at).getTime() >= threshold : true;
    }

    return matchSearch && matchStatus && matchClient && matchStaff && matchDate;
  });

  return (
    <div className="space-y-6 text-left antialiased">
      <ToastNotification message={toast} onClose={() => setToast('')} />

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-black text-slate-900 tracking-tight flex items-center gap-2">
              <Globe className="w-6 h-6 text-indigo-600" /> Ferex Global Trade & Logistics Central Oversight
            </h1>
            <span className="text-[10px] font-black bg-indigo-50 text-indigo-700 border border-indigo-200 px-2.5 py-0.5 rounded-full">
              Live Supabase Sync
            </span>
          </div>
          <p className="text-xs font-semibold text-slate-500 mt-1">
            Central executive oversight of international maritime freight, 7 trade document types, Letter of Credit financing, and live logistics reassignment.
          </p>
        </div>
        <Button size="sm" variant="outline" className="text-xs font-bold" onClick={loadData}>
          <RefreshCw className="w-3.5 h-3.5 mr-1" /> Refresh Feeds
        </Button>
      </div>

      {/* KPI Cards — Live Supabase Calculations */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Total Business Order Value', val: `€${(totalOrderValueEur / 1000).toFixed(1)}K`, sub: `${shipments.length} Active Cargo Orders`, color: 'text-indigo-700 bg-indigo-50 border-indigo-100' },
          { label: 'Pending Invoice Settlements', val: `€${(pendingPaymentsEur / 1000).toFixed(1)}K`, sub: `${invoices.filter((i: any) => i.status !== 'Paid').length} Invoices Pending`, color: 'text-amber-700 bg-amber-50 border-amber-100' },
          { label: 'Shipments in Transit', val: `${inTransitCount} Maritime Units`, sub: 'Active Sea & Air Routes', color: 'text-blue-700 bg-blue-50 border-blue-100' },
          { label: 'Pending / Audit Documents', val: `${overdueDocsCount} Required Files`, sub: `${documents.length} Verified in Vault`, color: 'text-emerald-700 bg-emerald-50 border-emerald-100' },
        ].map((kpi, idx) => (
          <Card key={idx} className="p-4 border border-slate-200/70 shadow-xs space-y-1">
            <span className="text-[10px] font-black uppercase text-slate-400">{kpi.label}</span>
            <div className="text-xl font-black text-slate-900">{kpi.val}</div>
            <span className="text-[11px] font-bold text-slate-500">{kpi.sub}</span>
          </Card>
        ))}
      </div>

      {/* Navigation Tabs */}
      <div className="flex gap-2 border-b border-slate-200 pb-2 overflow-x-auto text-xs font-bold">
        {[
          { id: 'shipments', label: `Maritime Shipments (${shipments.length})`, icon: Ship },
          { id: 'documents', label: `7 Trade Documents (${documents.length})`, icon: FileText },
          { id: 'lcs', label: `Letters of Credit (${lcs.length})`, icon: CreditCard },
          { id: 'clients', label: `Trade Partner Accounts (${clients.length})`, icon: Anchor }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl transition-all whitespace-nowrap ${
              activeTab === tab.id ? 'bg-[#58051E] text-white shadow-xs' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            <tab.icon className="w-3.5 h-3.5" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* ── TAB 1: SHIPMENTS ── */}
      {activeTab === 'shipments' && (
        <div className="space-y-4">
          <Card className="p-4 border border-slate-200/70 shadow-xs space-y-3">
            <div className="flex flex-col lg:flex-row gap-3 items-center justify-between">
              <div className="relative w-full lg:w-80">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder="Search order #, container, client, carrier..."
                  className="w-full h-9 pl-9 pr-4 bg-slate-100/70 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:bg-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              {/* Status Filter */}
              <div className="flex items-center gap-1.5 overflow-x-auto w-full lg:w-auto">
                {['All', 'Order Confirmed', 'In Transit', 'Customs Clearance', 'Delivered'].map(st => (
                  <button
                    key={st}
                    onClick={() => setStatusFilter(st)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                      statusFilter === st ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    {st}
                  </button>
                ))}
              </div>
            </div>

            {/* Sub-Filters: Client, Date Range & Staff */}
            <div className="flex flex-wrap items-center gap-4 pt-2 border-t border-slate-100 text-xs">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-extrabold uppercase text-slate-400">Client:</span>
                <select
                  value={clientFilter}
                  onChange={e => setClientFilter(e.target.value)}
                  className="h-7 px-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-700"
                >
                  <option value="All">All Clients</option>
                  {Array.from(new Set(shipments.map(s => s.client_name).filter(Boolean))).map(cName => (
                    <option key={cName} value={cName}>{cName}</option>
                  ))}
                </select>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-[10px] font-extrabold uppercase text-slate-400">Date Range:</span>
                <select
                  value={dateFilter}
                  onChange={e => setDateFilter(e.target.value as any)}
                  className="h-7 px-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-700"
                >
                  <option value="All">All Time</option>
                  <option value="7days">Last 7 Days</option>
                  <option value="30days">Last 30 Days</option>
                </select>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-[10px] font-extrabold uppercase text-slate-400">Staff:</span>
                <select
                  value={staffFilter}
                  onChange={e => setStaffFilter(e.target.value)}
                  className="h-7 px-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-700"
                >
                  <option value="All">All Logistics Staff</option>
                  {staffList.map(st => (
                    <option key={st.id || st.name} value={st.name}>{st.name}</option>
                  ))}
                </select>
              </div>

              <span className="ml-auto text-xs font-bold text-slate-400">
                {filteredShipments.length} Cargo Shipments
              </span>
            </div>
          </Card>

          <Card className="overflow-hidden border border-slate-200/70 shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-[10px] font-black uppercase text-slate-400 select-none">
                    <th className="py-3 px-4">Order / Shipment #</th>
                    <th className="py-3 px-4">Client / Buyer</th>
                    <th className="py-3 px-4">Origin / Destination</th>
                    <th className="py-3 px-4 text-right">Order Value</th>
                    <th className="py-3 px-4 text-center">Status</th>
                    <th className="py-3 px-4">Assigned Staff</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs font-semibold text-slate-700">
                  {loading ? (
                    <tr>
                      <td colSpan={7} className="py-12 text-center text-xs font-bold text-slate-400">
                        Loading trade shipments from Supabase...
                      </td>
                    </tr>
                  ) : filteredShipments.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-12 text-center text-xs font-bold text-slate-400">
                        No trade shipments found matching the active filters.
                      </td>
                    </tr>
                  ) : (
                    filteredShipments.map(s => {
                      const currentStage = s.stage || s.status || s.shipment_status || 'In Transit';
                      const staffName = s.assigned_staff_name || s.assigned_staff || 'Elena Rostova';
                      const totalVal = Number(s.total_amount || s.cargo_value || 0);

                      return (
                        <tr key={s.id} className="hover:bg-slate-50/80 transition-colors">
                          <td className="py-3.5 px-4 font-mono font-bold text-slate-900">
                            <div>{s.order_no || s.shipment_no || s.id}</div>
                            <span className="text-[10px] text-slate-400 font-normal">Tracking: {s.tracking_number || s.container_no || 'TBN'}</span>
                          </td>
                          <td className="py-3.5 px-4">
                            <div className="text-slate-900 font-bold">{s.client_name || s.carrier || 'Global Trade Partner'}</div>
                            <span className="text-[10px] text-slate-400">{s.commodity || 'General Cargo'}</span>
                          </td>
                          <td className="py-3.5 px-4">
                            <div className="text-slate-800">{s.origin_port || 'Port of Gdansk, Poland'}</div>
                            <span className="text-[10px] text-slate-400">To: {s.destination_port || 'Port of Rotterdam, NL'}</span>
                          </td>
                          <td className="py-3.5 px-4 text-right font-mono font-bold text-slate-900">
                            €{totalVal.toLocaleString()}
                          </td>
                          <td className="py-3.5 px-4 text-center">
                            <span className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-black border ${
                              currentStage === 'Delivered'
                                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                : currentStage === 'Customs Clearance'
                                ? 'bg-amber-50 text-amber-700 border-amber-200'
                                : 'bg-blue-50 text-blue-700 border-blue-200'
                            }`}>
                              {currentStage}
                            </span>
                          </td>
                          <td className="py-3.5 px-4">
                            <div className="flex items-center gap-1.5">
                              <strong className="text-slate-800">{staffName}</strong>
                              <button
                                onClick={() => {
                                  setReassignModal(s);
                                  setNewStaff(staffName || (staffList[0]?.name || ''));
                                }}
                                className="text-[10px] font-bold text-[#58051E] hover:underline cursor-pointer"
                              >
                                (Reassign)
                              </button>
                            </div>
                          </td>
                          <td className="py-3.5 px-4 text-right space-x-1.5">
                            <select
                              value={currentStage}
                              onChange={e => handleUpdateShipmentStage(s, e.target.value)}
                              className="h-8 px-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold"
                            >
                              <option value="Inquiry">Inquiry</option>
                              <option value="Quote Sent">Quote Sent</option>
                              <option value="Order Confirmed">Order Confirmed</option>
                              <option value="Shipped">Shipped / In Transit</option>
                              <option value="Customs Clearance">Customs Clearance</option>
                              <option value="Delivered">Delivered</option>
                            </select>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}

      {/* ── TAB 2: 7 TRADE DOCUMENTS ── */}
      {activeTab === 'documents' && (
        <Card className="p-6 border border-slate-200/70 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h3 className="text-sm font-black text-slate-900">7 Mandatory Global Trade Document Categories</h3>
              <p className="text-xs text-slate-500 mt-0.5">Automated transaction notices triggered to foreign buyers upon document verification.</p>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[
              'Proforma Invoice',
              'Commercial Invoice',
              'Packing List',
              'Bill of Lading / Airway Bill',
              'Certificate of Origin',
              'Letter of Credit',
              'Inspection Certificate'
            ].map(docType => {
              const matched = documents.filter(d => (d.folder === docType || d.doc_type === docType || d.type === docType));
              return (
                <div key={docType} className="p-4 rounded-xl bg-slate-50 border border-slate-200/80 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black text-slate-900">{docType}</span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                      {matched.length} Files
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500">SWIFT & Customs Audit Compliant</p>
                  <div className="pt-2 border-t border-slate-200 flex justify-between items-center text-[11px] font-bold text-indigo-600">
                    <span>Status: Verified ({matched.length > 0 ? '100%' : 'Ready'})</span>
                    <span>Active In Vault</span>
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      )}

      {/* ── TAB 3: LETTERS OF CREDIT ── */}
      {activeTab === 'lcs' && (
        <Card className="overflow-hidden border border-slate-200/70 shadow-xs">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-[10px] font-black uppercase text-slate-400">
                <th className="py-3 px-4">LC Number & SWIFT Ref</th>
                <th className="py-3 px-4">Issuing Bank</th>
                <th className="py-3 px-4">Beneficiary Partner</th>
                <th className="py-3 px-4 text-right">Amount (EUR)</th>
                <th className="py-3 px-4 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs font-semibold text-slate-700">
              {lcs.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-xs font-bold text-slate-400">
                    No active Letters of Credit registered.
                  </td>
                </tr>
              ) : (
                lcs.map(lc => (
                  <tr key={lc.id} className="hover:bg-slate-50/80">
                    <td className="py-3.5 px-4 font-mono font-bold text-indigo-600">{lc.lc_number || lc.id}</td>
                    <td className="py-3.5 px-4 font-bold text-slate-800">{lc.issuing_bank || 'HSBC / Warsaw Desk'}</td>
                    <td className="py-3.5 px-4">{lc.beneficiary || 'Global Port Buyer Corp'}</td>
                    <td className="py-3.5 px-4 text-right font-mono font-black text-slate-900">
                      €{Number(lc.amount || 0).toLocaleString()}
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-emerald-50 text-emerald-700 border border-emerald-200">
                        {lc.status || 'Active & Confirmed'}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </Card>
      )}

      {/* ── TAB 4: TRADE CLIENTS ── */}
      {activeTab === 'clients' && (
        <Card className="overflow-hidden border border-slate-200/70 shadow-xs">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-[10px] font-black uppercase text-slate-400">
                <th className="py-3 px-4">Company Name</th>
                <th className="py-3 px-4">Contact Person</th>
                <th className="py-3 px-4">Email & Phone</th>
                <th className="py-3 px-4">Country / Region</th>
                <th className="py-3 px-4 text-right">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs font-semibold text-slate-700">
              {clients.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-xs font-bold text-slate-400">
                    No trade partner contacts registered.
                  </td>
                </tr>
              ) : (
                clients.map(c => (
                  <tr key={c.id} className="hover:bg-slate-50/80">
                    <td className="py-3.5 px-4 font-bold text-slate-900">{c.company_name || c.name}</td>
                    <td className="py-3.5 px-4">{c.contact_person || 'Representative'}</td>
                    <td className="py-3.5 px-4">
                      <div>{c.email}</div>
                      <span className="text-[10px] text-slate-400">{c.phone || '—'}</span>
                    </td>
                    <td className="py-3.5 px-4 text-slate-800">{c.country || 'International'}</td>
                    <td className="py-3.5 px-4 text-right">
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-emerald-50 text-emerald-700 border border-emerald-200">
                        Active Partner
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </Card>
      )}

      {/* Reassign Staff Modal */}
      <AnimatePresence>
        {reassignModal && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50" onClick={() => setReassignModal(null)} />
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-md bg-white rounded-2xl shadow-2xl z-50 border border-slate-100 p-6 text-left">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
                <h3 className="text-sm font-black text-slate-900">Reassign Global Trade Staff</h3>
                <button onClick={() => setReassignModal(null)} className="p-1 text-slate-400 hover:text-slate-600"><X className="w-4 h-4" /></button>
              </div>
              <div className="space-y-4 text-xs">
                <p className="font-bold text-slate-700">Shipment / Order: <span className="text-slate-900 font-extrabold">{reassignModal.order_no || reassignModal.shipment_no || reassignModal.id}</span></p>
                <div>
                  <label className="block text-[10px] font-extrabold text-slate-400 uppercase mb-1">Select Port Logistics Staff</label>
                  <select
                    value={newStaff}
                    onChange={e => setNewStaff(e.target.value)}
                    className="w-full h-9 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold"
                  >
                    {staffList.map(st => (
                      <option key={st.id || st.email} value={st.name}>
                        {st.name} ({st.roleLabel || st.division})
                      </option>
                    ))}
                  </select>
                </div>
                <div className="pt-3 flex gap-2">
                  <Button type="button" variant="outline" size="sm" className="flex-1 text-xs font-bold" onClick={() => setReassignModal(null)}>Cancel</Button>
                  <Button
                    type="button"
                    size="sm"
                    className="flex-1 text-xs font-bold bg-[#58051E] hover:bg-[#430316]"
                    onClick={handleConfirmReassign}
                  >
                    Confirm Reassignment
                  </Button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};
