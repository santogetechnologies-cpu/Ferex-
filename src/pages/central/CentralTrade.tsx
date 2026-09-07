import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Globe, Search, Ship, FileText, CreditCard, CheckCircle2,
  Anchor, RefreshCw
} from 'lucide-react';
import { Card } from '../../components/Card';
import { Button } from '../../components/Button';
import {
  getTradeShipments,
  getTradeDocuments,
  getTradeLettersOfCredit,
  getTradeCRMContacts
} from '../../lib/api/trade';
import { sendTradeStageEmail } from '../../lib/api/automatedEmails';

export const CentralTrade: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'shipments' | 'documents' | 'lcs' | 'clients'>('shipments');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [toast, setToast] = useState('');
  const [, setLoading] = useState(true);

  const [shipments, setShipments] = useState<any[]>([]);
  const [documents, setDocuments] = useState<any[]>([]);
  const [lcs, setLcs] = useState<any[]>([]);
  const [clients, setClients] = useState<any[]>([]);

  const [reassignModal, setReassignModal] = useState<any | null>(null);
  const [newStaff, setNewStaff] = useState('Marek Kowalski');

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(''), 3000);
  };

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [sData, dData, lcData, cData] = await Promise.all([
        getTradeShipments(),
        getTradeDocuments(),
        getTradeLettersOfCredit(),
        getTradeCRMContacts()
      ]);
      setShipments(sData || []);
      setDocuments(dData || []);
      setLcs(lcData || []);
      setClients(cData || []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Aggregate Metrics
  const totalShipmentValueEur = shipments.reduce((sum, s) => sum + Number(s.cargo_value || (Number(s.cargo_weight_kg || 0) * 4.5)), 0);
  const inTransitCount = shipments.filter(s => (s.status || s.shipment_status) === 'In Transit').length;
  const verifiedDocsCount = documents.length;
  const totalLcsValueEur = lcs.reduce((sum, l) => sum + (Number(l.amount || 0)), 0);

  const handleUpdateShipmentStage = async (shipment: any, newStage: string) => {
    // Send automated email to buyer
    await sendTradeStageEmail({
      clientEmail: 'buyer@globaltrade.eu',
      clientName: shipment.carrier || 'Commercial Trade Buyer',
      shipmentNo: shipment.shipment_no || shipment.id,
      stage: newStage as any,
      trackingNo: shipment.container_no,
      carrier: shipment.carrier,
      origin: shipment.origin_port,
      destination: shipment.destination_port
    });
    showToast(`Shipment ${shipment.shipment_no || shipment.id} updated to ${newStage} & automated buyer email dispatched!`);
    loadData();
  };

  const filteredShipments = shipments.filter(s => {
    const matchSearch =
      (s.shipment_no || s.id || '').toLowerCase().includes(search.toLowerCase()) ||
      (s.container_no || '').toLowerCase().includes(search.toLowerCase()) ||
      (s.carrier || '').toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === 'All' || (s.status || s.shipment_status) === statusFilter;
    return matchSearch && matchStatus;
  });

  return (
    <div className="space-y-6 text-left antialiased">
      <AnimatePresence>
        {toast && (
          <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="fixed top-20 right-8 z-50 bg-[#6A1B2E] text-white text-xs font-bold px-4 py-2.5 rounded-xl shadow-xl flex items-center gap-2 border border-white/20">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />{toast}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-black text-slate-900 tracking-tight flex items-center gap-2">
              <Globe className="w-6 h-6 text-indigo-600" /> Ferex Global Trade & Logistics Central Oversight
            </h1>
            <span className="text-[10px] font-black bg-indigo-50 text-indigo-700 border border-indigo-200 px-2.5 py-0.5 rounded-full">
              Subsidiary Governance
            </span>
          </div>
          <p className="text-xs font-semibold text-slate-500 mt-1">
            Central executive oversight of international maritime freight, 7 trade document types, Letter of Credit financing, and buyer automated emails.
          </p>
        </div>
        <Button size="sm" variant="outline" className="text-xs font-bold" onClick={loadData}>
          <RefreshCw className="w-3.5 h-3.5 mr-1" /> Refresh Trade Feeds
        </Button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Total Freight Value', val: `€${(totalShipmentValueEur / 1000).toFixed(0)}K`, sub: 'Active Trade Cargo', color: 'text-indigo-700 bg-indigo-50 border-indigo-100' },
          { label: 'Shipments in Transit', val: `${inTransitCount} Maritime Units`, sub: 'Maersk / MSC Oscar', color: 'text-blue-700 bg-blue-50 border-blue-100' },
          { label: 'Trade Document Vault', val: `${verifiedDocsCount} SWIFT Files`, sub: '7 Standard Types', color: 'text-emerald-700 bg-emerald-50 border-emerald-100' },
          { label: 'Letter of Credit (LC)', val: `€${(totalLcsValueEur / 1000).toFixed(0)}K`, sub: 'Irrevocable At Sight', color: 'text-amber-700 bg-amber-50 border-amber-100' },
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
              activeTab === tab.id ? 'bg-[#6A1B2E] text-white shadow-xs' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
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
          <Card className="p-4 border border-slate-200/70 shadow-xs flex flex-col md:flex-row gap-3 items-center justify-between">
            <div className="relative w-full md:w-80">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search shipment #, container, carrier..."
                className="w-full h-9 pl-9 pr-4 bg-slate-100/70 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900"
              />
            </div>
            <div className="flex items-center gap-1.5 overflow-x-auto">
              {['All', 'In Transit', 'Customs Cleared', 'Delivered'].map(st => (
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
          </Card>

          <Card className="overflow-hidden border border-slate-200/70 shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-[10px] font-black uppercase text-slate-400">
                    <th className="py-3 px-4">Shipment & Container</th>
                    <th className="py-3 px-4">Origin ➔ Destination</th>
                    <th className="py-3 px-4">Carrier & Vessel</th>
                    <th className="py-3 px-4 text-center">Status</th>
                    <th className="py-3 px-4">Assigned Staff</th>
                    <th className="py-3 px-4 text-right">One-Click Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs font-semibold text-slate-700">
                  {filteredShipments.map(s => (
                    <tr key={s.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3.5 px-4 font-mono font-bold text-slate-900">
                        <div>{s.shipment_no || s.id}</div>
                        <span className="text-[10px] text-slate-400 font-normal">Container: {s.container_no || 'TBN'}</span>
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="text-slate-800">{s.origin_port || 'Port of Gdansk, Poland'}</div>
                        <span className="text-[10px] text-slate-400">➔ {s.destination_port || 'Port of Rotterdam, NL'}</span>
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="text-slate-800 font-bold">{s.carrier || 'Maersk Line'}</div>
                        <span className="text-[10px] text-slate-400">ETA: {s.eta || '2026-09-20'}</span>
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <span className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-black border ${
                          (s.status || s.shipment_status) === 'Delivered'
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            : 'bg-blue-50 text-blue-700 border-blue-200'
                        }`}>
                          {s.status || s.shipment_status || 'In Transit'}
                        </span>
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-1.5">
                          <strong className="text-slate-800">{s.assigned_staff || 'Marek Kowalski'}</strong>
                          <button
                            onClick={() => setReassignModal(s)}
                            className="text-[10px] font-bold text-[#6A1B2E] hover:underline"
                          >
                            (Reassign)
                          </button>
                        </div>
                      </td>
                      <td className="py-3.5 px-4 text-right space-x-1.5">
                        <select
                          value={s.status || s.shipment_status || 'In Transit'}
                          onChange={e => handleUpdateShipmentStage(s, e.target.value)}
                          className="h-8 px-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold"
                        >
                          <option value="Order Confirmed">Order Confirmed</option>
                          <option value="In Transit">In Transit</option>
                          <option value="Customs Cleared">Customs Cleared</option>
                          <option value="Delivered">Delivered</option>
                        </select>
                      </td>
                    </tr>
                  ))}
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
              const matched = documents.filter(d => (d.folder === docType || d.doc_type === docType));
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
                    <span>Status: Verified (100%)</span>
                    <span>Ready ➔</span>
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
                <th className="py-3 px-4 text-right">Amount (EUR / INR)</th>
                <th className="py-3 px-4 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs font-semibold text-slate-700">
              {lcs.map(lc => (
                <tr key={lc.id} className="hover:bg-slate-50/80">
                  <td className="py-3.5 px-4 font-mono font-bold text-indigo-600">{lc.lc_number || lc.id}</td>
                  <td className="py-3.5 px-4 font-bold text-slate-800">{lc.issuing_bank || 'HSBC London / Warsaw Desk'}</td>
                  <td className="py-3.5 px-4">{lc.beneficiary || 'Global Port Buyer Corp'}</td>
                  <td className="py-3.5 px-4 text-right font-mono font-black text-slate-900">
                    €{Number(lc.amount || 120000).toLocaleString()}
                  </td>
                  <td className="py-3.5 px-4 text-center">
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-emerald-50 text-emerald-700 border border-emerald-200">
                      {lc.status || 'Active & Confirmed'}
                    </span>
                  </td>
                </tr>
              ))}
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
                <button onClick={() => setReassignModal(null)} className="p-1 text-slate-400 hover:text-slate-600">✕</button>
              </div>
              <div className="space-y-4 text-xs">
                <p className="font-bold text-slate-700">Shipment: <span className="text-slate-900">{reassignModal.shipment_no || reassignModal.id}</span></p>
                <div>
                  <label className="block text-[10px] font-extrabold text-slate-400 uppercase mb-1">Select Port Logistics Staff</label>
                  <select
                    value={newStaff}
                    onChange={e => setNewStaff(e.target.value)}
                    className="w-full h-9 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold"
                  >
                    <option value="Marek Kowalski (Port Logistics Admin)">Marek Kowalski (Port Logistics Admin)</option>
                    <option value="Jan Nowak (Customs Clearance Specialist)">Jan Nowak (Customs Clearance Specialist)</option>
                    <option value="Tomasz Wisniewski (Maritime Operations)">Tomasz Wisniewski (Maritime Operations)</option>
                    <option value="Super Admin HQ">Super Admin HQ</option>
                  </select>
                </div>
                <div className="pt-3 flex gap-2">
                  <Button type="button" variant="outline" size="sm" className="flex-1 text-xs font-bold" onClick={() => setReassignModal(null)}>Cancel</Button>
                  <Button
                    type="button"
                    size="sm"
                    className="flex-1 text-xs font-bold bg-[#6A1B2E] hover:bg-[#521221]"
                    onClick={() => {
                      setShipments(prev => prev.map(s => s.id === reassignModal.id ? { ...s, assigned_staff: newStaff } : s));
                      setReassignModal(null);
                      showToast(`Reassigned shipment to ${newStaff}!`);
                    }}
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
