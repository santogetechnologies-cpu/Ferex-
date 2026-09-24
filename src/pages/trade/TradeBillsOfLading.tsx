import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FileCheck2, Search, Download, Eye, X, CheckCircle2, Anchor, Trash2, Plus,
  Ship, Building2, Truck
} from 'lucide-react';
import { Card } from '../../components/Card';
import { Button } from '../../components/Button';
import { ToastNotification } from '../../components/ToastNotification';
import {
  getTradeBillsOfLading,
  createTradeBillOfLading,
  updateTradeBillOfLadingStatus,
  deleteTradeBillOfLading,
  getTradeCRMContacts,
  getTradeShipments,
  TRADE_MASTER_CARRIERS,
  TRADE_MASTER_VESSELS,
  TRADE_MASTER_PORTS,
  TRADE_BL_STATUSES
} from '../../lib/api/trade';
import { supabase } from '../../lib/supabase';

export const TradeBillsOfLading: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState('All');
  const [selectedBL, setSelectedBL] = useState<any>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [toast, setToast] = useState('');
  const [loading, setLoading] = useState(true);
  const [bills, setBills] = useState<any[]>([]);
  const [crmPartners, setCrmPartners] = useState<any[]>([]);
  const [shipments, setShipments] = useState<any[]>([]);

  const initialBL = {
    shipment_no: '',
    vessel: 'MSC Gülsün (IMO: 9839438)',
    voyage_no: 'VY-2026-088',
    carrier: 'MSC (Mediterranean Shipping Company)',
    pol: 'Port of Gdansk, Poland',
    pod: 'Port of Nhava Sheva (JNPT), India',
    consignee: '',
    shipper: 'FEREX Global Trade Operations Ltd',
    notify_party: '',
    container_no: '',
    cargo_description: '',
    total_packages: '48',
    gross_weight_kg: '26500',
    freight_terms: 'Freight Prepaid',
    status: 'Issued'
  };

  const [newBL, setNewBL] = useState(initialBL);
  const [isCustomConsignee, setIsCustomConsignee] = useState(false);

  const loadData = React.useCallback(async () => {
    setLoading(true);
    try {
      const [data, partners, shipData] = await Promise.all([
        getTradeBillsOfLading(),
        getTradeCRMContacts().catch(() => []),
        getTradeShipments().catch(() => [])
      ]);

      if (Array.isArray(partners)) setCrmPartners(partners);
      if (Array.isArray(shipData)) setShipments(shipData);

      if (Array.isArray(data)) {
        setBills(data.map((b: any) => ({
          id: b.bl_number || b.id,
          rawId: b.id,
          shipment_no: b.shipment_no || 'SHP-9821',
          vessel: b.vessel_name || b.vessel || 'MSC Gülsün',
          voyage: b.voyage_no || 'VY-2026-088',
          carrier: b.carrier || 'MSC',
          pol: b.port_of_loading || b.pol || 'Port of Gdansk, Poland',
          pod: b.port_of_discharge || b.pod || 'Port of Nhava Sheva, India',
          consignee: b.consignee || 'Trade Partner Consignee',
          shipper: b.shipper || 'FEREX Global Trade Operations Ltd',
          notifyParty: b.notify_party || 'Same as Consignee',
          container: b.container_no || 'MSCU-902184-7',
          cargo: b.cargo_description || 'General Trade Cargo',
          totalPackages: b.total_packages || 48,
          packageType: b.package_type || 'Bulk Pallets',
          grossWeight: `${Number(b.gross_weight_kg || 20000).toLocaleString()} kg`,
          freightTerms: b.freight_terms || 'Freight Prepaid',
          issueDate: b.issue_date || '2026-09-02',
          status: b.status || 'Issued',
          statusBadge: (b.status === 'Issued' || b.status === 'Released' || b.status === 'Clean On-Board Signed')
            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
            : (b.status === 'Surrendered')
              ? 'bg-purple-50 text-purple-700 border-purple-200'
              : 'bg-blue-50 text-blue-700 border-blue-200'
        })));
      } else {
        setBills([]);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();

    const channel = supabase
      .channel('realtime_trade_bls_page')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'trade_bills_of_lading' }, () => {
        loadData();
      })
      .subscribe();

    const handleLocalChange = () => loadData();
    window.addEventListener('ferex_trade_bls_change', handleLocalChange);

    return () => {
      supabase.removeChannel(channel);
      window.removeEventListener('ferex_trade_bls_change', handleLocalChange);
    };
  }, [loadData]);

  const showToastMsg = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(''), 3000);
  };

  const handleShipmentSelect = (shpId: string) => {
    const shp = shipments.find(s => s.id === shpId || s.shipment_no === shpId);
    if (shp) {
      setNewBL(prev => ({
        ...prev,
        shipment_no: shp.shipment_no || shp.id,
        consignee: shp.partner_name || prev.consignee,
        notify_party: `${shp.partner_name || 'Consignee'} Operations Desk`,
        carrier: shp.carrier || prev.carrier,
        vessel: shp.carrier_vessel || prev.vessel,
        voyage_no: shp.voyage_no || prev.voyage_no,
        pol: shp.origin_port || prev.pol,
        pod: shp.destination_port || prev.pod,
        container_no: shp.container_no || prev.container_no,
        cargo_description: shp.cargo_description || shp.cargo || prev.cargo_description,
        gross_weight_kg: String(shp.cargo_weight_kg || prev.gross_weight_kg),
      }));
    } else {
      setNewBL(prev => ({ ...prev, shipment_no: shpId }));
    }
  };

  const handleCreateBL = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newBL.vessel || !newBL.carrier || !newBL.consignee) return;

    const created = await createTradeBillOfLading({
      shipment_no: newBL.shipment_no,
      vessel_name: newBL.vessel,
      voyage_no: newBL.voyage_no,
      carrier: newBL.carrier,
      port_of_loading: newBL.pol,
      port_of_discharge: newBL.pod,
      consignee: newBL.consignee,
      shipper: newBL.shipper,
      notify_party: newBL.notify_party,
      container_no: newBL.container_no,
      cargo_description: newBL.cargo_description,
      total_packages: Number(newBL.total_packages) || 48,
      gross_weight_kg: Number(newBL.gross_weight_kg) || 20000,
      freight_terms: newBL.freight_terms,
      status: newBL.status,
    });

    setNewBL(initialBL);
    setShowCreateModal(false);
    showToastMsg(`Registered Bill of Lading ${created.bl_number || created.id}`);
    await loadData();
  };

  const handleStatusChange = async (id: string, rawId: string, newStatus: string) => {
    try {
      await updateTradeBillOfLadingStatus(rawId || id, newStatus);
      showToastMsg(`B/L status updated to ${newStatus}`);
      await loadData();
    } catch (err: any) {
      showToastMsg(`Error updating B/L status: ${err.message || 'Unknown error'}`);
    }
  };

  const handleDeleteBL = async (id: string, rawId?: string) => {
    if (!window.confirm(`Delete Bill of Lading ${id}?`)) return;
    setBills(prev => prev.filter(b => b.id !== id && b.rawId !== rawId));
    showToastMsg(`Removed Bill of Lading ${id}`);
    await deleteTradeBillOfLading(rawId || id);
    await loadData();
  };

  const downloadBLDocument = (b: any) => {
    const rows = [
      ['FEREX GLOBAL TRADE OCEAN BILL OF LADING'],
      ['B/L Number', b.id],
      ['Shipment Reference', b.shipment_no],
      ['Shipper / Exporter', b.shipper],
      ['Consignee / Importer', b.consignee],
      ['Notify Party', b.notifyParty],
      ['Ocean Carrier', b.carrier],
      ['Vessel Name', b.vessel],
      ['Voyage Number', b.voyage],
      ['Port of Loading', b.pol],
      ['Port of Discharge', b.pod],
      ['Container Number', b.container],
      ['Cargo Description', b.cargo],
      ['Gross Weight', b.grossWeight],
      ['Freight Terms', b.freightTerms],
      ['Issue Date', b.issueDate],
      ['Status', b.status],
    ];
    const csv = rows.map(r => r.map((v: any) => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${b.id}_Ocean_Bill_of_Lading.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const filteredBills = bills.filter((b) => {
    const matchesSearch =
      b.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      b.vessel.toLowerCase().includes(searchQuery.toLowerCase()) ||
      b.carrier.toLowerCase().includes(searchQuery.toLowerCase()) ||
      b.consignee.toLowerCase().includes(searchQuery.toLowerCase()) ||
      b.pol.toLowerCase().includes(searchQuery.toLowerCase()) ||
      b.pod.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = filterStatus === 'All' || b.status === filterStatus;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-6 text-left antialiased">
      {/* Toast */}
      <ToastNotification message={toast} onClose={() => setToast('')} />

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-black text-slate-900 flex items-center gap-2">
            <FileCheck2 className="w-5 h-5 text-[#58051E]" />
            Ocean & Air Bills of Lading (B/L)
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Issue, amend, release and track maritime title documents with carrier vessel schedules and notify party details.
          </p>
        </div>
        <Button
          size="sm"
          className="bg-[#58051E] hover:bg-[#430316] text-white text-xs font-bold shadow-xs cursor-pointer"
          onClick={() => setShowCreateModal(true)}
        >
          <Plus className="w-4 h-4 mr-1.5" />
          Issue Bill of Lading
        </Button>
      </div>

      {/* Search & Filter */}
      <Card className="p-3 border border-slate-200/80 shadow-xs">
        <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
          <div className="relative w-full sm:w-80">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by B/L #, vessel, carrier, consignee, port..."
              className="w-full h-9 pl-9 pr-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:bg-white focus:outline-none focus:border-[#58051E]"
            />
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <span className="text-[10px] font-extrabold uppercase text-slate-400">Status:</span>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="h-8.5 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:outline-none focus:border-[#58051E]"
            >
              <option value="All">All B/Ls ({bills.length})</option>
              {TRADE_BL_STATUSES.map(st => (
                <option key={st} value={st}>{st} ({bills.filter(b => b.status === st).length})</option>
              ))}
            </select>
          </div>
        </div>
      </Card>

      {/* Table */}
      {loading ? (
        <div className="p-12 text-center text-xs font-bold text-slate-400">Loading Bills of Lading...</div>
      ) : filteredBills.length === 0 ? (
        <Card className="p-12 text-center border border-dashed border-slate-200">
          <FileCheck2 className="w-10 h-10 text-slate-300 mx-auto mb-3" />
          <h3 className="text-sm font-black text-slate-800">No Bills of Lading found</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1">
            {searchQuery ? 'No B/Ls match your search query.' : 'Issue a clean on-board Ocean Bill of Lading for an active maritime shipment.'}
          </p>
          <Button
            size="sm"
            className="mt-4 bg-[#58051E] hover:bg-[#430316] text-white text-xs font-bold cursor-pointer"
            onClick={() => setShowCreateModal(true)}
          >
            <Plus className="w-3.5 h-3.5 mr-1" /> Issue Bill of Lading
          </Button>
        </Card>
      ) : (
        <Card className="p-0 overflow-hidden border border-slate-200/80 shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/75 text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
                  <th className="py-3 px-4">B/L Number</th>
                  <th className="py-3 px-4">Vessel & Carrier</th>
                  <th className="py-3 px-4">Loading ➔ Discharge Port</th>
                  <th className="py-3 px-4">Consignee</th>
                  <th className="py-3 px-4">Freight Terms</th>
                  <th className="py-3 px-4">Issue Date</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs font-semibold text-slate-700">
                {filteredBills.map((b) => (
                  <tr key={b.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3.5 px-4 font-black text-[#58051E] whitespace-nowrap">
                      {b.id}
                    </td>
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <div className="font-extrabold text-slate-900">{b.vessel}</div>
                      <div className="text-[10px] text-slate-400 font-medium">{b.carrier} • {b.voyage}</div>
                    </td>
                    <td className="py-3.5 px-4 text-slate-600 max-w-[200px] truncate">
                      <div className="truncate font-medium">{b.pol}</div>
                      <div className="text-[10px] text-slate-400">➔ {b.pod}</div>
                    </td>
                    <td className="py-3.5 px-4 font-extrabold text-slate-900 max-w-[160px] truncate" title={b.consignee}>
                      {b.consignee}
                    </td>
                    <td className="py-3.5 px-4 whitespace-nowrap text-[11px] font-bold text-slate-600">
                      {b.freightTerms}
                    </td>
                    <td className="py-3.5 px-4 whitespace-nowrap text-slate-500 text-[11px]">
                      {b.issueDate}
                    </td>
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <select
                        value={b.status}
                        onChange={(e) => handleStatusChange(b.id, b.rawId, e.target.value)}
                        className={`text-[10.5px] font-extrabold px-2.5 py-1 rounded-full border cursor-pointer focus:outline-none ${b.statusBadge}`}
                      >
                        {TRADE_BL_STATUSES.map(st => (
                          <option key={st} value={st}>{st}</option>
                        ))}
                      </select>
                    </td>
                    <td className="py-3.5 px-4 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => setSelectedBL(b)}
                          className="p-1.5 text-slate-400 hover:text-[#58051E] hover:bg-slate-100 rounded-lg cursor-pointer"
                          title="View B/L Dossier"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => downloadBLDocument(b)}
                          className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg cursor-pointer"
                          title="Export Document"
                        >
                          <Download className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteBL(b.id, b.rawId)}
                          className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg cursor-pointer"
                          title="Delete B/L"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* ── MODAL 1: ISSUE B/L ── */}
      <AnimatePresence>
        {showCreateModal && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50" onClick={() => setShowCreateModal(false)} />
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-xl bg-white rounded-2xl shadow-2xl z-50 border border-slate-100 p-6 max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-4 pb-2 border-b border-slate-100">
                <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
                  <FileCheck2 className="w-4 h-4 text-[#58051E]" /> Issue Ocean Bill of Lading
                </h3>
                <button onClick={() => setShowCreateModal(false)} className="p-1 text-slate-400 hover:text-slate-600 cursor-pointer"><X className="w-4 h-4" /></button>
              </div>

              <form onSubmit={handleCreateBL} className="space-y-3.5">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-extrabold text-slate-400 uppercase mb-1">Select Shipment Reference</label>
                    <select
                      value={newBL.shipment_no}
                      onChange={(e) => handleShipmentSelect(e.target.value)}
                      className="w-full h-8.5 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:outline-none focus:border-[#58051E]"
                    >
                      <option value="">Select active shipment...</option>
                      {shipments.map(s => <option key={s.id} value={s.id}>{s.id} ({s.cargo})</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] font-extrabold text-slate-400 uppercase mb-1">Ocean Carrier</label>
                    <select
                      value={newBL.carrier}
                      onChange={(e) => setNewBL({ ...newBL, carrier: e.target.value })}
                      className="w-full h-8.5 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:outline-none focus:border-[#58051E]"
                    >
                      {TRADE_MASTER_CARRIERS.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-extrabold text-slate-400 uppercase mb-1">Vessel Name</label>
                    <select
                      value={newBL.vessel}
                      onChange={(e) => setNewBL({ ...newBL, vessel: e.target.value })}
                      className="w-full h-8.5 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:outline-none focus:border-[#58051E]"
                    >
                      {TRADE_MASTER_VESSELS.map(v => <option key={v} value={v}>{v}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] font-extrabold text-slate-400 uppercase mb-1">Voyage Number</label>
                    <input
                      type="text"
                      value={newBL.voyage_no}
                      onChange={(e) => setNewBL({ ...newBL, voyage_no: e.target.value })}
                      placeholder="VY-2026-088"
                      className="w-full h-8.5 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:border-[#58051E]"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-extrabold text-slate-400 uppercase mb-1">Port of Loading (POL)</label>
                    <input
                      type="text"
                      list="bl-master-pol-ports"
                      value={newBL.pol}
                      onChange={(e) => setNewBL({ ...newBL, pol: e.target.value })}
                      placeholder="Select or enter custom port..."
                      className="w-full h-8.5 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:bg-white focus:outline-none focus:border-[#58051E]"
                    />
                    <datalist id="bl-master-pol-ports">
                      {TRADE_MASTER_PORTS.map(p => <option key={p} value={p}>{p}</option>)}
                    </datalist>
                  </div>
                  <div>
                    <label className="block text-[10px] font-extrabold text-slate-400 uppercase mb-1">Port of Discharge (POD)</label>
                    <input
                      type="text"
                      list="bl-master-pod-ports"
                      value={newBL.pod}
                      onChange={(e) => setNewBL({ ...newBL, pod: e.target.value })}
                      placeholder="Select or enter custom port..."
                      className="w-full h-8.5 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:bg-white focus:outline-none focus:border-[#58051E]"
                    />
                    <datalist id="bl-master-pod-ports">
                      {TRADE_MASTER_PORTS.map(p => <option key={p} value={p}>{p}</option>)}
                    </datalist>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-extrabold text-slate-400 uppercase mb-1">Consignee (Importer) *</label>
                    {!isCustomConsignee ? (
                      <select
                        required
                        value={newBL.consignee}
                        onChange={(e) => {
                          if (e.target.value === '__CUSTOM__') {
                            setIsCustomConsignee(true);
                            setNewBL({ ...newBL, consignee: '' });
                          } else {
                            setNewBL({ ...newBL, consignee: e.target.value });
                          }
                        }}
                        className="w-full h-8.5 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:bg-white focus:outline-none focus:border-[#58051E]"
                      >
                        <option value="">-- Select Registered CRM Partner --</option>
                        {crmPartners.map(p => (
                          <option key={p.id} value={p.company_name || p.name}>
                            {p.company_name || p.name} ({p.category || p.partner_type || 'Partner'})
                          </option>
                        ))}
                        <option value="__CUSTOM__">➕ + Type Custom Consignee Name...</option>
                      </select>
                    ) : (
                      <div className="flex gap-2">
                        <input
                          type="text"
                          required
                          value={newBL.consignee}
                          onChange={(e) => setNewBL({ ...newBL, consignee: e.target.value })}
                          placeholder="Enter custom consignee company..."
                          className="flex-1 h-8.5 px-3 bg-white border border-[#58051E] rounded-xl text-xs font-semibold focus:outline-none"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            setIsCustomConsignee(false);
                            setNewBL({ ...newBL, consignee: '' });
                          }}
                          className="px-2.5 py-1 text-[11px] font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl cursor-pointer"
                        >
                          Select
                        </button>
                      </div>
                    )}
                  </div>
                  <div>
                    <label className="block text-[10px] font-extrabold text-slate-400 uppercase mb-1">Notify Party</label>
                    <input
                      type="text"
                      value={newBL.notify_party}
                      onChange={(e) => setNewBL({ ...newBL, notify_party: e.target.value })}
                      placeholder="e.g. Logistics Desk Gdansk"
                      className="w-full h-8.5 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:border-[#58051E]"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-extrabold text-slate-400 uppercase mb-1">Freight Terms</label>
                    <select
                      value={newBL.freight_terms}
                      onChange={(e) => setNewBL({ ...newBL, freight_terms: e.target.value })}
                      className="w-full h-8.5 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:outline-none focus:border-[#58051E]"
                    >
                      <option value="Freight Prepaid">Freight Prepaid</option>
                      <option value="Freight Collect">Freight Collect</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] font-extrabold text-slate-400 uppercase mb-1">Status</label>
                    <select
                      value={newBL.status}
                      onChange={(e) => setNewBL({ ...newBL, status: e.target.value })}
                      className="w-full h-8.5 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:outline-none focus:border-[#58051E]"
                    >
                      {TRADE_BL_STATUSES.map(st => <option key={st} value={st}>{st}</option>)}
                    </select>
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                  <Button type="button" variant="outline" size="sm" onClick={() => setShowCreateModal(false)}>Cancel</Button>
                  <Button type="submit" size="sm" className="bg-[#58051E] hover:bg-[#430316] text-white">Issue Ocean B/L</Button>
                </div>
              </form>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* ── MODAL 2: B/L DOSSIER ── */}
      <AnimatePresence>
        {selectedBL && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50" onClick={() => setSelectedBL(null)} />
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-2xl bg-white rounded-2xl shadow-2xl z-50 border border-slate-100 p-6 max-h-[90vh] overflow-y-auto text-left">
              <div className="flex items-start justify-between pb-4 border-b border-slate-100">
                <div>
                  <span className="text-[10px] font-black uppercase text-[#58051E] bg-[#58051E]/10 px-2 py-0.5 rounded">
                    {selectedBL.id}
                  </span>
                  <h2 className="text-lg font-black text-slate-900 mt-1">Ocean Bill of Lading Dossier</h2>
                  <p className="text-xs text-slate-500">Carrier: {selectedBL.carrier} • Vessel: {selectedBL.vessel}</p>
                </div>
                <button onClick={() => setSelectedBL(null)} className="p-1 text-slate-400 hover:text-slate-600"><X className="w-5 h-5" /></button>
              </div>

              <div className="py-4 space-y-3 text-xs">
                <div className="grid grid-cols-2 gap-3 p-3 bg-slate-50 rounded-xl border border-slate-100">
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase block">Shipper / Exporter</span>
                    <span className="font-extrabold text-slate-900">{selectedBL.shipper}</span>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase block">Consignee</span>
                    <span className="font-extrabold text-slate-900">{selectedBL.consignee}</span>
                  </div>
                </div>

                <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 flex items-center justify-between">
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase block">Port of Loading</span>
                    <span className="font-bold text-slate-800">{selectedBL.pol}</span>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase block">Port of Discharge</span>
                    <span className="font-bold text-slate-800">{selectedBL.pod}</span>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase block">Freight Terms</span>
                    <span className="font-bold text-slate-800">{selectedBL.freightTerms}</span>
                  </div>
                </div>

                <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                  <div className="text-slate-500">Container: <strong className="font-mono text-slate-900">{selectedBL.container}</strong></div>
                  <div className="text-slate-500 mt-1">Cargo Description: <strong className="text-slate-900">{selectedBL.cargo}</strong> ({selectedBL.grossWeight})</div>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 flex justify-between">
                <button
                  onClick={() => downloadBLDocument(selectedBL)}
                  className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" /> Export B/L
                </button>
                <Button size="sm" variant="outline" onClick={() => setSelectedBL(null)}>Close</Button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

    </div>
  );
};
