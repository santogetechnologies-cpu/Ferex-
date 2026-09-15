import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import {
  Truck, Search, Plus, Eye, Trash2, X, CheckCircle2, Anchor, Navigation,
  Warehouse, AlertTriangle, ShieldAlert, Layers, TrendingDown,
  FileSpreadsheet, PackageCheck, FileCheck2, Award, FolderArchive, Building2, CreditCard
} from 'lucide-react';
import { Card } from '../../components/Card';
import { Button } from '../../components/Button';
import { supabase } from '../../lib/supabase';
import {
  getTradeShipments,
  createTradeShipment,
  deleteTradeShipment,
  updateTradeShipmentStatus,
  getTradeCRMContacts,
  getTradeDossier,
  getTradeBondedInventory,
  createTradeBondedItem,
  updateTradeBondedStock,
  deleteTradeBondedItem,
  getTradeCargoLosses,
  createTradeCargoLoss,
  deleteTradeCargoLoss,
  getTradeCargoLossSummary,
  TRADE_MASTER_PORTS,
  TRADE_MASTER_CARRIERS,
  TRADE_MASTER_VESSELS,
  TRADE_MASTER_INCOTERMS,
  TRADE_SHIPMENT_STATUSES,
  type BondedCargoItem,
  type CargoLossRecord
} from '../../lib/api/trade';

export const TradeShipments: React.FC = () => {
  const navigate = useNavigate();

  // Navigation Tabs
  const [activeTab, setActiveTab] = useState<'containers' | 'bonded_warehouse' | 'cargo_losses'>('containers');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterMode, setFilterMode] = useState('All');
  const [filterStatus, setFilterStatus] = useState('All');
  const [selectedShipment, setSelectedShipment] = useState<any>(null);
  const [toast, setToast] = useState('');
  const [loading, setLoading] = useState(true);

  // Data States
  const [shipments, setShipments] = useState<any[]>([]);
  const [crmPartners, setCrmPartners] = useState<any[]>([]);
  const [bondedInventory, setBondedInventory] = useState<BondedCargoItem[]>([]);
  const [cargoLosses, setCargoLosses] = useState<CargoLossRecord[]>([]);
  const [lossSummary, setLossSummary] = useState({
    totalLossInr: 0,
    totalDemurrageInr: 0,
    totalShrinkageTons: 0,
    recoveredInr: 0,
    totalLossesCount: 0
  });

  // Dossier data for selected shipment
  const [dossierData, setDossierData] = useState<any>({
    invoices: [],
    packingLists: [],
    billsOfLading: [],
    certificates: [],
    lettersOfCredit: [],
    payments: [],
    documents: [],
  });

  // Modal States
  const [showAddShipmentModal, setShowAddShipmentModal] = useState(false);
  const [showAddBondedModal, setShowAddBondedModal] = useState(false);
  const [showAddLossModal, setShowAddLossModal] = useState(false);
  const [selectedBondedItem, setSelectedBondedItem] = useState<BondedCargoItem | null>(null);

  const showToastMsg = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(''), 3500);
  };

  // Loader
  const loadAllTradeData = React.useCallback(async () => {
    setLoading(true);
    try {
      const [shipData, partners, bondData, lossData, lossSum] = await Promise.all([
        getTradeShipments(),
        getTradeCRMContacts(),
        getTradeBondedInventory(),
        getTradeCargoLosses(),
        getTradeCargoLossSummary()
      ]);

      if (Array.isArray(shipData)) {
        setShipments(shipData.map(d => ({
          id: d.shipment_no || d.id,
          rawId: d.id,
          partner_name: d.partner_name || 'Global Trade Partner',
          partner_id: d.partner_id || '',
          container: d.container_no,
          carrier: d.carrier || 'Maersk Line',
          carrier_vessel: d.carrier_vessel || 'MSC Gülsün',
          voyage_no: d.voyage_no || 'VY-2026-088',
          origin: d.origin_port || 'Port of Gdansk, Poland',
          destination: d.destination_port || 'Port of Nhava Sheva (JNPT), India',
          cargo: d.cargo_description || 'General Trade Cargo',
          weight: `${Number(d.cargo_weight_kg || 20000).toLocaleString()} kg`,
          rawWeight: Number(d.cargo_weight_kg || 20000),
          incoterm: d.incoterm || 'CIF (Cost, Insurance and Freight)',
          etd: d.etd || '2026-09-01',
          eta: d.eta || '2026-09-24',
          mode: d.transport_mode || 'Maritime',
          status: d.status || d.shipment_status || 'In Transit',
          customs_status: d.customs_status || 'Pre-Clearance In Progress',
          payment_status: d.payment_status || 'Issued',
          statusBadge: (d.status === 'In Transit' || d.shipment_status === 'In Transit')
            ? 'bg-blue-50 text-blue-700 border-blue-200'
            : (d.status === 'Delivered' || d.status === 'Cleared' || d.status === 'Customs Cleared')
              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
              : 'bg-amber-50 text-amber-700 border-amber-200'
        })));
      } else {
        setShipments([]);
      }

      setCrmPartners(partners || []);
      setBondedInventory(bondData || []);
      setCargoLosses(lossData || []);
      setLossSummary(lossSum);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAllTradeData();

    const channel = supabase
      .channel('realtime_trade_shipments_all')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'trade_shipments' }, () => {
        loadAllTradeData();
      })
      .subscribe();

    const handleSync = () => loadAllTradeData();
    window.addEventListener('ferex_trade_shipments_change', handleSync);
    window.addEventListener('ferex_trade_crm_change', handleSync);
    window.addEventListener('ferex_trade_bonded_inventory_change', handleSync);
    window.addEventListener('ferex_trade_cargo_losses_change', handleSync);

    return () => {
      supabase.removeChannel(channel);
      window.removeEventListener('ferex_trade_shipments_change', handleSync);
      window.removeEventListener('ferex_trade_crm_change', handleSync);
      window.removeEventListener('ferex_trade_bonded_inventory_change', handleSync);
      window.removeEventListener('ferex_trade_cargo_losses_change', handleSync);
    };
  }, [loadAllTradeData]);

  // Load Dossier for selected shipment
  useEffect(() => {
    if (!selectedShipment) return;
    const fetchDossier = async () => {
      const res = await getTradeDossier('shipment', selectedShipment.id);
      setDossierData(res);
    };
    fetchDossier();
  }, [selectedShipment]);

  // Form State: Container
  const initialShipment = {
    partner_name: '',
    container: '',
    carrier: 'Maersk Line',
    carrier_vessel: 'MSC Gülsün (IMO: 9839438)',
    origin: 'Port of Gdansk, Poland',
    destination: 'Port of Nhava Sheva (JNPT), India',
    cargo: '',
    weight: '24000',
    incoterm: 'CIF (Cost, Insurance and Freight)',
    etd: new Date().toISOString().split('T')[0],
    eta: new Date(Date.now() + 18 * 86400000).toISOString().split('T')[0],
    mode: 'Maritime',
    status: 'Booked'
  };
  const [newShipment, setNewShipment] = useState(initialShipment);

  // Form State: Bonded Item
  const initialBonded = {
    sku: '',
    commodity: '',
    category: 'Agricultural Grains',
    port_location: 'Port of Gdansk, Poland',
    warehouse_bay: 'Bay 01-East',
    in_stock_metric_tons: '' as any,
    reserved_metric_tons: '' as any,
    unit_value_inr: '' as any,
    customs_bond_no: '',
    status: 'In Bond' as const
  };
  const [newBonded, setNewBonded] = useState(initialBonded);

  // Form State: Cargo Loss
  const initialLoss = {
    shipment_no: '',
    container_no: '',
    loss_type: 'Demurrage & Detention Fine' as const,
    cargo_description: '',
    lost_quantity_metric_tons: '' as any,
    direct_financial_loss_inr: '' as any,
    demurrage_incurred_inr: '' as any,
    insurance_claim_status: 'Claim Lodged' as const,
    recovered_amount_inr: '' as any,
    incident_date: new Date().toISOString().split('T')[0],
    port_or_location: 'Port of Gdansk, Poland',
    root_cause: ''
  };
  const [newLoss, setNewLoss] = useState(initialLoss);

  // Handlers
  const handleCreateShipment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newShipment.container || !newShipment.cargo) return;

    const partnerMatch = crmPartners.find(p => (p.company_name || p.name) === newShipment.partner_name);

    const created = await createTradeShipment({
      container_no: newShipment.container,
      partner_id: partnerMatch?.id || '',
      partner_name: newShipment.partner_name || 'Global Trade Partner',
      carrier: newShipment.carrier,
      carrier_vessel: newShipment.carrier_vessel,
      origin_port: newShipment.origin,
      destination_port: newShipment.destination,
      cargo_description: newShipment.cargo,
      cargo_weight_kg: Number(newShipment.weight) || 20000,
      transport_mode: newShipment.mode,
      incoterm: newShipment.incoterm,
      etd: newShipment.etd,
      eta: newShipment.eta,
      status: newShipment.status
    });

    setNewShipment(initialShipment);
    setShowAddShipmentModal(false);
    showToastMsg(`Shipment ${created.shipment_no} booked successfully`);
    await loadAllTradeData();
  };

  const handleStatusChange = async (id: string, newStatus: string) => {
    await updateTradeShipmentStatus(id, newStatus);
    showToastMsg(`Shipment status updated to: ${newStatus}`);
    await loadAllTradeData();
  };

  const handleDeleteShipment = async (id: string, rawId?: string) => {
    if (!window.confirm(`Delete shipment ${id}?`)) return;
    setShipments(prev => prev.filter(s => s.id !== id && s.rawId !== rawId));
    showToastMsg(`Removed Shipment ${id}`);
    await deleteTradeShipment(rawId || id);
    await loadAllTradeData();
  };

  const handleCreateBonded = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newBonded.commodity) return;
    await createTradeBondedItem({
      ...newBonded,
      in_stock_metric_tons: Number(newBonded.in_stock_metric_tons) || 0,
      reserved_metric_tons: Number(newBonded.reserved_metric_tons) || 0,
      unit_value_inr: Number(newBonded.unit_value_inr) || 0
    });
    setNewBonded(initialBonded);
    setShowAddBondedModal(false);
    showToastMsg('Bonded warehouse inventory lot added.');
    await loadAllTradeData();
  };

  const handleCreateLoss = async (e: React.FormEvent) => {
    e.preventDefault();
    await createTradeCargoLoss({
      ...newLoss,
      lost_quantity_metric_tons: Number(newLoss.lost_quantity_metric_tons) || 0,
      direct_financial_loss_inr: Number(newLoss.direct_financial_loss_inr) || 0,
      demurrage_incurred_inr: Number(newLoss.demurrage_incurred_inr) || 0,
      recovered_amount_inr: Number(newLoss.recovered_amount_inr) || 0
    });
    setNewLoss(initialLoss);
    setShowAddLossModal(false);
    showToastMsg('Incident report logged.');
    await loadAllTradeData();
  };

  const filteredShipments = shipments.filter(s => {
    const matchesSearch =
      s.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.container.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.partner_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.carrier.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.cargo.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.origin.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.destination.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesMode = filterMode === 'All' || s.mode === filterMode;
    const matchesStatus = filterStatus === 'All' || s.status === filterStatus;
    return matchesSearch && matchesMode && matchesStatus;
  });

  return (
    <div className="space-y-6 text-left antialiased">
      {/* Toast Notification */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed top-20 right-6 z-50 bg-slate-900 text-white px-4 py-2.5 rounded-xl shadow-xl flex items-center gap-2 border border-slate-700 text-xs font-bold"
          >
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            {toast}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-black text-slate-900 flex items-center gap-2">
            <Truck className="w-5 h-5 text-[#58051E]" />
            Maritime Shipments & Freight Operations
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Real-time tracking of ocean containers, customs bonded stockpiles, demurrage and cargo loss mitigation.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {activeTab === 'containers' && (
            <Button
              size="sm"
              className="bg-[#58051E] hover:bg-[#430316] text-white text-xs font-bold shadow-xs cursor-pointer"
              onClick={() => setShowAddShipmentModal(true)}
            >
              <Plus className="w-4 h-4 mr-1.5" /> Book New Shipment
            </Button>
          )}
          {activeTab === 'bonded_warehouse' && (
            <Button
              size="sm"
              className="bg-[#58051E] hover:bg-[#430316] text-white text-xs font-bold shadow-xs cursor-pointer"
              onClick={() => setShowAddBondedModal(true)}
            >
              <Plus className="w-4 h-4 mr-1.5" /> Register Bonded Cargo
            </Button>
          )}
          {activeTab === 'cargo_losses' && (
            <Button
              size="sm"
              className="bg-red-700 hover:bg-red-800 text-white text-xs font-bold shadow-xs cursor-pointer"
              onClick={() => setShowAddLossModal(true)}
            >
              <Plus className="w-4 h-4 mr-1.5" /> Log Demurrage / Loss
            </Button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200">
        <button
          onClick={() => setActiveTab('containers')}
          className={`pb-3 px-3 text-xs font-bold transition-all border-b-2 cursor-pointer flex items-center gap-1.5 ${
            activeTab === 'containers'
              ? 'border-[#58051E] text-[#58051E]'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Truck className="w-4 h-4" /> Ocean Containers & Shipments ({shipments.length})
        </button>

        <button
          onClick={() => setActiveTab('bonded_warehouse')}
          className={`pb-3 px-3 text-xs font-bold transition-all border-b-2 cursor-pointer flex items-center gap-1.5 ${
            activeTab === 'bonded_warehouse'
              ? 'border-[#58051E] text-[#58051E]'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Warehouse className="w-4 h-4" /> Customs Bonded Yards ({bondedInventory.length})
        </button>

        <button
          onClick={() => setActiveTab('cargo_losses')}
          className={`pb-3 px-3 text-xs font-bold transition-all border-b-2 cursor-pointer flex items-center gap-1.5 ${
            activeTab === 'cargo_losses'
              ? 'border-[#58051E] text-[#58051E]'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <AlertTriangle className="w-4 h-4" /> Demurrage & Cargo Loss Audit ({cargoLosses.length})
        </button>
      </div>

      {/* ── TAB 1: OCEAN CONTAINERS ── */}
      {activeTab === 'containers' && (
        <div className="space-y-4">
          {/* Filter Bar */}
          <Card className="p-3 border border-slate-200/80 shadow-xs">
            <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
              <div className="relative w-full sm:w-80">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search by shipment #, container, partner, port, carrier..."
                  className="w-full h-9 pl-9 pr-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:bg-white focus:outline-none focus:border-[#58051E]"
                />
              </div>

              <div className="flex items-center gap-3 w-full sm:w-auto">
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  className="h-8.5 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:outline-none focus:border-[#58051E]"
                >
                  <option value="All">All Statuses</option>
                  {TRADE_SHIPMENT_STATUSES.map(st => (
                    <option key={st} value={st}>{st}</option>
                  ))}
                </select>
              </div>
            </div>
          </Card>

          {/* Table */}
          {loading ? (
            <div className="p-12 text-center text-xs font-bold text-slate-400">Loading shipments ledger...</div>
          ) : filteredShipments.length === 0 ? (
            <Card className="p-12 text-center border border-dashed border-slate-200">
              <Truck className="w-10 h-10 text-slate-300 mx-auto mb-3" />
              <h3 className="text-sm font-black text-slate-800">No active shipments found</h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1">
                {searchQuery ? 'No shipments match your search filter.' : 'Book a new international shipment linked to a registered Trade CRM partner.'}
              </p>
              <Button
                size="sm"
                className="mt-4 bg-[#58051E] hover:bg-[#430316] text-white text-xs font-bold cursor-pointer"
                onClick={() => setShowAddShipmentModal(true)}
              >
                <Plus className="w-3.5 h-3.5 mr-1" /> Book New Shipment
              </Button>
            </Card>
          ) : (
            <Card className="p-0 overflow-hidden border border-slate-200/80 shadow-xs">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-100 bg-slate-50/75 text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
                      <th className="py-3 px-4">Shipment #</th>
                      <th className="py-3 px-4">Trade Partner</th>
                      <th className="py-3 px-4">Container & Carrier</th>
                      <th className="py-3 px-4">Origin ➔ Destination Port</th>
                      <th className="py-3 px-4">Cargo & Weight</th>
                      <th className="py-3 px-4">ETA</th>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-xs font-semibold text-slate-700">
                    {filteredShipments.map((s) => (
                      <tr key={s.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-3.5 px-4 font-black text-[#58051E] whitespace-nowrap">
                          {s.id}
                        </td>
                        <td className="py-3.5 px-4 font-extrabold text-slate-900 max-w-[150px] truncate" title={s.partner_name}>
                          {s.partner_name}
                        </td>
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          <div className="font-mono font-bold text-slate-900 text-[11px]">{s.container}</div>
                          <div className="text-[10px] text-slate-400 font-medium">{s.carrier} • {s.carrier_vessel}</div>
                        </td>
                        <td className="py-3.5 px-4 text-slate-600 max-w-[200px] truncate">
                          <div className="truncate font-medium">{s.origin}</div>
                          <div className="text-[10px] text-slate-400">➔ {s.destination}</div>
                        </td>
                        <td className="py-3.5 px-4 max-w-[180px] truncate">
                          <div className="truncate text-slate-900 font-bold">{s.cargo}</div>
                          <div className="text-[10px] text-slate-400">{s.weight} • {s.incoterm?.split(' ')[0]}</div>
                        </td>
                        <td className="py-3.5 px-4 whitespace-nowrap text-slate-600 text-[11px]">
                          {s.eta}
                        </td>
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          <select
                            value={s.status}
                            onChange={(e) => handleStatusChange(s.id, e.target.value)}
                            className="text-[10.5px] font-extrabold px-2.5 py-1 rounded-full border cursor-pointer bg-white text-slate-800 border-slate-200 focus:outline-none focus:border-[#58051E]"
                          >
                            {TRADE_SHIPMENT_STATUSES.map(st => (
                              <option key={st} value={st}>{st}</option>
                            ))}
                          </select>
                        </td>
                        <td className="py-3.5 px-4 text-right whitespace-nowrap">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => setSelectedShipment(s)}
                              className="p-1.5 text-slate-400 hover:text-[#58051E] hover:bg-slate-100 rounded-lg cursor-pointer"
                              title="Inspect Full Shipment Lifecycle Dossier"
                            >
                              <Eye className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDeleteShipment(s.id, s.rawId)}
                              className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg cursor-pointer"
                              title="Delete Shipment"
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
        </div>
      )}

      {/* ── TAB 2: BONDED WAREHOUSE ── */}
      {activeTab === 'bonded_warehouse' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {bondedInventory.map((item) => (
              <Card key={item.id} className="p-4 border border-slate-200/80 shadow-xs hover:border-[#58051E]/30 transition-all flex flex-col justify-between">
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <span className="text-[9px] font-black uppercase tracking-wider text-[#58051E] bg-[#58051E]/10 px-2 py-0.5 rounded">
                        {item.sku}
                      </span>
                      <h3 className="text-sm font-black text-slate-900 mt-1">{item.commodity}</h3>
                      <p className="text-[11px] font-semibold text-slate-500">{item.port_location} • {item.warehouse_bay}</p>
                    </div>
                    <span className="text-[10px] font-extrabold px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200">
                      {item.status}
                    </span>
                  </div>

                  <div className="grid grid-cols-3 gap-2 text-center bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                    <div>
                      <span className="text-[9px] font-bold text-slate-400 uppercase block">In Stock</span>
                      <span className="text-xs font-black text-slate-900">{item.in_stock_metric_tons} MT</span>
                    </div>
                    <div>
                      <span className="text-[9px] font-bold text-slate-400 uppercase block">Reserved</span>
                      <span className="text-xs font-black text-amber-700">{item.reserved_metric_tons} MT</span>
                    </div>
                    <div>
                      <span className="text-[9px] font-bold text-slate-400 uppercase block">Available</span>
                      <span className="text-xs font-black text-emerald-700">{item.available_metric_tons} MT</span>
                    </div>
                  </div>

                  <div className="text-xs space-y-1 font-semibold text-slate-600 bg-white p-2 rounded-xl border border-slate-100">
                    <div><span className="text-slate-400">Customs Bond:</span> {item.customs_bond_no}</div>
                    <div><span className="text-slate-400">Total Valuation:</span> ₹{item.total_valuation_inr.toLocaleString('en-IN')}</div>
                    <div><span className="text-slate-400">Last Inspection:</span> {item.last_inspected_at}</div>
                  </div>
                </div>

                <div className="pt-3 mt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                  <button onClick={() => setSelectedBondedItem(item)} className="font-extrabold text-[#58051E] hover:underline cursor-pointer">
                    Adjust Stock
                  </button>
                  <button onClick={() => deleteTradeBondedItem(item.id)} className="text-slate-400 hover:text-red-600 cursor-pointer">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* ── TAB 3: CARGO LOSSES & DEMURRAGE ── */}
      {activeTab === 'cargo_losses' && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-3.5 bg-rose-50 rounded-2xl border border-rose-200">
              <span className="text-[10px] font-bold text-rose-600 uppercase block">Total Direct Loss</span>
              <span className="text-base font-black text-rose-950">₹{lossSummary.totalLossInr.toLocaleString('en-IN')}</span>
            </div>
            <div className="p-3.5 bg-amber-50 rounded-2xl border border-amber-200">
              <span className="text-[10px] font-bold text-amber-700 uppercase block">Demurrage Incurred</span>
              <span className="text-base font-black text-amber-950">₹{lossSummary.totalDemurrageInr.toLocaleString('en-IN')}</span>
            </div>
            <div className="p-3.5 bg-blue-50 rounded-2xl border border-blue-200">
              <span className="text-[10px] font-bold text-blue-700 uppercase block">Shrinkage Quantity</span>
              <span className="text-base font-black text-blue-950">{lossSummary.totalShrinkageTons} MT</span>
            </div>
            <div className="p-3.5 bg-emerald-50 rounded-2xl border border-emerald-200">
              <span className="text-[10px] font-bold text-emerald-700 uppercase block">Insurance Recovered</span>
              <span className="text-base font-black text-emerald-950">₹{lossSummary.recoveredInr.toLocaleString('en-IN')}</span>
            </div>
          </div>

          <Card className="p-0 overflow-hidden border border-slate-200/80 shadow-xs">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/75 text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
                  <th className="py-3 px-4">Incident Ref</th>
                  <th className="py-3 px-4">Shipment & Container</th>
                  <th className="py-3 px-4">Loss Type</th>
                  <th className="py-3 px-4">Demurrage / Financial Impact</th>
                  <th className="py-3 px-4">Insurance Status</th>
                  <th className="py-3 px-4">Date</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs font-semibold text-slate-700">
                {cargoLosses.map((l) => (
                  <tr key={l.id} className="hover:bg-slate-50/80">
                    <td className="py-3.5 px-4 font-black text-rose-700">{l.incident_ref}</td>
                    <td className="py-3.5 px-4 font-extrabold text-slate-900">{l.shipment_no} ({l.container_no})</td>
                    <td className="py-3.5 px-4 text-slate-700">{l.loss_type}</td>
                    <td className="py-3.5 px-4 font-bold text-rose-700">₹{(l.demurrage_incurred_inr || l.direct_financial_loss_inr).toLocaleString('en-IN')}</td>
                    <td className="py-3.5 px-4"><span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">{l.insurance_claim_status}</span></td>
                    <td className="py-3.5 px-4 text-slate-500">{l.incident_date}</td>
                    <td className="py-3.5 px-4 text-right">
                      <button onClick={() => deleteTradeCargoLoss(l.id)} className="p-1 text-slate-400 hover:text-red-600"><Trash2 className="w-4 h-4" /></button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        </div>
      )}

      {/* ── MODAL 1: BOOK NEW SHIPMENT ── */}
      <AnimatePresence>
        {showAddShipmentModal && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50" onClick={() => setShowAddShipmentModal(false)} />
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-xl bg-white rounded-2xl shadow-2xl z-50 border border-slate-100 p-6 max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-4 pb-2 border-b border-slate-100">
                <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
                  <Truck className="w-4 h-4 text-[#58051E]" /> Book Maritime Cargo Shipment
                </h3>
                <button onClick={() => setShowAddShipmentModal(false)} className="p-1 text-slate-400 hover:text-slate-600 cursor-pointer"><X className="w-4 h-4" /></button>
              </div>

              <form onSubmit={handleCreateShipment} className="space-y-3.5">
                {/* Partner Selection */}
                <div>
                  <label className="block text-[10px] font-extrabold text-slate-400 uppercase mb-1">Trade CRM Partner Entity *</label>
                  <input
                    type="text"
                    required
                    list="shipment-partner-list"
                    value={newShipment.partner_name}
                    onChange={(e) => setNewShipment({ ...newShipment, partner_name: e.target.value })}
                    placeholder="Select or type Trade Partner..."
                    className="w-full h-9 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:bg-white focus:outline-none focus:border-[#58051E]"
                  />
                  <datalist id="shipment-partner-list">
                    {crmPartners.map(p => (
                      <option key={p.id} value={p.company_name || p.name}>
                        {p.company_name || p.name} ({p.category})
                      </option>
                    ))}
                  </datalist>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-extrabold text-slate-400 uppercase mb-1">Container Number (ISO) *</label>
                    <input
                      type="text"
                      required
                      value={newShipment.container}
                      onChange={(e) => setNewShipment({ ...newShipment, container: e.target.value })}
                      placeholder="e.g. MSCU-902184-7"
                      className="w-full h-8.5 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold font-mono focus:bg-white focus:outline-none focus:border-[#58051E]"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-extrabold text-slate-400 uppercase mb-1">Ocean Carrier</label>
                    <select
                      value={newShipment.carrier}
                      onChange={(e) => setNewShipment({ ...newShipment, carrier: e.target.value })}
                      className="w-full h-8.5 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:outline-none focus:border-[#58051E]"
                    >
                      {TRADE_MASTER_CARRIERS.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-extrabold text-slate-400 uppercase mb-1">Port of Loading (Origin)</label>
                    <select
                      value={newShipment.origin}
                      onChange={(e) => setNewShipment({ ...newShipment, origin: e.target.value })}
                      className="w-full h-8.5 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:outline-none focus:border-[#58051E]"
                    >
                      {TRADE_MASTER_PORTS.map(p => <option key={p} value={p}>{p}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] font-extrabold text-slate-400 uppercase mb-1">Port of Discharge (Destination)</label>
                    <select
                      value={newShipment.destination}
                      onChange={(e) => setNewShipment({ ...newShipment, destination: e.target.value })}
                      className="w-full h-8.5 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:outline-none focus:border-[#58051E]"
                    >
                      {TRADE_MASTER_PORTS.map(p => <option key={p} value={p}>{p}</option>)}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-extrabold text-slate-400 uppercase mb-1">Cargo Commodity Description *</label>
                  <input
                    type="text"
                    required
                    value={newShipment.cargo}
                    onChange={(e) => setNewShipment({ ...newShipment, cargo: e.target.value })}
                    placeholder="e.g. Agricultural Milling Wheat Grade-A (Bulk 40ft Reefer)"
                    className="w-full h-8.5 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:bg-white focus:outline-none focus:border-[#58051E]"
                  />
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[10px] font-extrabold text-slate-400 uppercase mb-1">Gross Weight (KG)</label>
                    <input
                      type="number"
                      value={newShipment.weight}
                      onChange={(e) => setNewShipment({ ...newShipment, weight: e.target.value })}
                      placeholder="24000"
                      className="w-full h-8.5 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:bg-white focus:outline-none focus:border-[#58051E]"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-extrabold text-slate-400 uppercase mb-1">Incoterms</label>
                    <select
                      value={newShipment.incoterm}
                      onChange={(e) => setNewShipment({ ...newShipment, incoterm: e.target.value })}
                      className="w-full h-8.5 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:outline-none focus:border-[#58051E]"
                    >
                      {TRADE_MASTER_INCOTERMS.map(i => <option key={i} value={i}>{i}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] font-extrabold text-slate-400 uppercase mb-1">Initial Status</label>
                    <select
                      value={newShipment.status}
                      onChange={(e) => setNewShipment({ ...newShipment, status: e.target.value })}
                      className="w-full h-8.5 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:outline-none focus:border-[#58051E]"
                    >
                      {TRADE_SHIPMENT_STATUSES.map(st => <option key={st} value={st}>{st}</option>)}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-extrabold text-slate-400 uppercase mb-1">Estimated Departure (ETD)</label>
                    <input
                      type="date"
                      value={newShipment.etd}
                      onChange={(e) => setNewShipment({ ...newShipment, etd: e.target.value })}
                      className="w-full h-8.5 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:bg-white focus:outline-none focus:border-[#58051E]"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-extrabold text-slate-400 uppercase mb-1">Estimated Arrival (ETA)</label>
                    <input
                      type="date"
                      value={newShipment.eta}
                      onChange={(e) => setNewShipment({ ...newShipment, eta: e.target.value })}
                      className="w-full h-8.5 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:bg-white focus:outline-none focus:border-[#58051E]"
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                  <Button type="button" variant="outline" size="sm" onClick={() => setShowAddShipmentModal(false)}>Cancel</Button>
                  <Button type="submit" size="sm" className="bg-[#58051E] hover:bg-[#430316] text-white">Book Shipment</Button>
                </div>
              </form>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* ── MODAL 2: SHIPMENT FULL LIFECYCLE DOSSIER ── */}
      <AnimatePresence>
        {selectedShipment && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50" onClick={() => setSelectedShipment(null)} />
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-3xl bg-white rounded-2xl shadow-2xl z-50 border border-slate-100 p-6 max-h-[90vh] overflow-y-auto text-left">
              <div className="flex items-start justify-between pb-4 border-b border-slate-100">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-black uppercase text-[#58051E] bg-[#58051E]/10 px-2 py-0.5 rounded">
                      {selectedShipment.id}
                    </span>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${selectedShipment.statusBadge}`}>
                      {selectedShipment.status}
                    </span>
                  </div>
                  <h2 className="text-lg font-black text-slate-900 mt-1">{selectedShipment.cargo}</h2>
                  <p className="text-xs text-slate-500">{selectedShipment.carrier} • Container: <span className="font-mono font-bold text-slate-700">{selectedShipment.container}</span></p>
                </div>
                <button onClick={() => setSelectedShipment(null)} className="p-1 text-slate-400 hover:text-slate-600 cursor-pointer"><X className="w-5 h-5" /></button>
              </div>

              {/* Connected Lifecycle Nodes */}
              <div className="py-4 space-y-4">
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 flex items-center justify-between text-xs">
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase block">Port Transit Route</span>
                    <span className="font-extrabold text-slate-900">{selectedShipment.origin} ➔ {selectedShipment.destination}</span>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] font-bold text-slate-400 uppercase block">ETA Date</span>
                    <span className="font-extrabold text-slate-900">{selectedShipment.eta}</span>
                  </div>
                </div>

                {/* Quick actions to create linked entities */}
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => { setSelectedShipment(null); navigate('/trade/invoices'); }}
                    className="px-3 py-1.5 bg-[#58051E]/10 text-[#58051E] hover:bg-[#58051E]/20 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                  >
                    <FileSpreadsheet className="w-3.5 h-3.5" /> Create Commercial Invoice
                  </button>
                  <button
                    onClick={() => { setSelectedShipment(null); navigate('/trade/packing-lists'); }}
                    className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                  >
                    <PackageCheck className="w-3.5 h-3.5" /> Generate Packing List
                  </button>
                  <button
                    onClick={() => { setSelectedShipment(null); navigate('/trade/bills-of-lading'); }}
                    className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                  >
                    <FileCheck2 className="w-3.5 h-3.5" /> Issue Ocean B/L
                  </button>
                </div>

                {/* Linked Invoices */}
                <div>
                  <h4 className="text-xs font-black uppercase text-slate-700 mb-2 flex items-center gap-1.5">
                    <FileSpreadsheet className="w-3.5 h-3.5 text-[#58051E]" /> Linked Commercial Invoices
                  </h4>
                  {dossierData.invoices.length === 0 ? (
                    <p className="text-xs text-slate-400 bg-slate-50 p-2.5 rounded-xl border border-slate-100">No invoice created against this shipment yet.</p>
                  ) : (
                    <div className="space-y-1.5">
                      {dossierData.invoices.map((inv: any) => (
                        <div key={inv.id} className="p-2.5 bg-slate-50 rounded-xl border border-slate-100 flex items-center justify-between text-xs">
                          <span className="font-bold text-slate-900">{inv.invoice_no || inv.id} ({inv.buyer_name})</span>
                          <span className="font-black text-slate-900">₹{Number(inv.amount).toLocaleString('en-IN')}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Linked Bills of Lading */}
                <div>
                  <h4 className="text-xs font-black uppercase text-slate-700 mb-2 flex items-center gap-1.5">
                    <FileCheck2 className="w-3.5 h-3.5 text-[#58051E]" /> Bills of Lading (Ocean / Air)
                  </h4>
                  {dossierData.billsOfLading.length === 0 ? (
                    <p className="text-xs text-slate-400 bg-slate-50 p-2.5 rounded-xl border border-slate-100">No B/L registered for this shipment.</p>
                  ) : (
                    <div className="space-y-1.5">
                      {dossierData.billsOfLading.map((bl: any) => (
                        <div key={bl.id} className="p-2.5 bg-slate-50 rounded-xl border border-slate-100 flex items-center justify-between text-xs">
                          <span className="font-bold text-slate-900">{bl.bl_number || bl.id} — Vessel: {bl.vessel_name}</span>
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">{bl.status}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 flex justify-end">
                <Button size="sm" variant="outline" onClick={() => setSelectedShipment(null)}>Close Dossier</Button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* ── MODAL 3: ADD BONDED LOT ── */}
      <AnimatePresence>
        {showAddBondedModal && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50" onClick={() => setShowAddBondedModal(false)} />
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-md bg-white rounded-2xl shadow-2xl z-50 border border-slate-100 p-6">
              <div className="flex items-center justify-between mb-4 pb-2 border-b border-slate-100">
                <h3 className="text-sm font-black text-slate-900">Register Customs Bonded Stockpile</h3>
                <button onClick={() => setShowAddBondedModal(false)} className="p-1 text-slate-400 hover:text-slate-600"><X className="w-4 h-4" /></button>
              </div>
              <form onSubmit={handleCreateBonded} className="space-y-3">
                <div>
                  <label className="block text-[10px] font-extrabold text-slate-400 uppercase mb-1">Commodity / Item Name</label>
                  <input
                    type="text"
                    required
                    value={newBonded.commodity}
                    onChange={(e) => setNewBonded({ ...newBonded, commodity: e.target.value })}
                    placeholder="e.g. Milling Wheat Grade A"
                    className="w-full h-8.5 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:bg-white focus:outline-none focus:border-[#58051E]"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-extrabold text-slate-400 uppercase mb-1">In Stock (Metric Tons)</label>
                    <input
                      type="number"
                      required
                      value={newBonded.in_stock_metric_tons}
                      onChange={(e) => setNewBonded({ ...newBonded, in_stock_metric_tons: e.target.value })}
                      placeholder="1000"
                      className="w-full h-8.5 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:bg-white focus:outline-none focus:border-[#58051E]"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-extrabold text-slate-400 uppercase mb-1">Unit Valuation (₹/MT)</label>
                    <input
                      type="number"
                      value={newBonded.unit_value_inr}
                      onChange={(e) => setNewBonded({ ...newBonded, unit_value_inr: e.target.value })}
                      placeholder="28000"
                      className="w-full h-8.5 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:bg-white focus:outline-none focus:border-[#58051E]"
                    />
                  </div>
                </div>
                <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                  <Button type="button" variant="outline" size="sm" onClick={() => setShowAddBondedModal(false)}>Cancel</Button>
                  <Button type="submit" size="sm" className="bg-[#58051E] hover:bg-[#430316] text-white">Save Stock</Button>
                </div>
              </form>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* ── MODAL 4: LOG CARGO LOSS / DEMURRAGE ── */}
      <AnimatePresence>
        {showAddLossModal && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50" onClick={() => setShowAddLossModal(false)} />
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-md bg-white rounded-2xl shadow-2xl z-50 border border-slate-100 p-6">
              <div className="flex items-center justify-between mb-4 pb-2 border-b border-slate-100">
                <h3 className="text-sm font-black text-slate-900">Log Demurrage or Cargo Loss Incident</h3>
                <button onClick={() => setShowAddLossModal(false)} className="p-1 text-slate-400 hover:text-slate-600"><X className="w-4 h-4" /></button>
              </div>
              <form onSubmit={handleCreateLoss} className="space-y-3">
                <div>
                  <label className="block text-[10px] font-extrabold text-slate-400 uppercase mb-1">Shipment Reference</label>
                  <select
                    value={newLoss.shipment_no}
                    onChange={(e) => setNewLoss({ ...newLoss, shipment_no: e.target.value })}
                    className="w-full h-8.5 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:outline-none focus:border-[#58051E]"
                  >
                    <option value="">Select Shipment...</option>
                    {shipments.map(s => <option key={s.id} value={s.id}>{s.id} ({s.cargo})</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-extrabold text-slate-400 uppercase mb-1">Demurrage / Direct Loss Amount (INR ₹)</label>
                  <input
                    type="number"
                    required
                    value={newLoss.demurrage_incurred_inr}
                    onChange={(e) => setNewLoss({ ...newLoss, demurrage_incurred_inr: e.target.value })}
                    placeholder="35000"
                    className="w-full h-8.5 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:bg-white focus:outline-none focus:border-[#58051E]"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-extrabold text-slate-400 uppercase mb-1">Root Cause Description</label>
                  <textarea
                    rows={2}
                    value={newLoss.root_cause}
                    onChange={(e) => setNewLoss({ ...newLoss, root_cause: e.target.value })}
                    placeholder="Describe customs hold, terminal congestion, or moisture damage..."
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:bg-white focus:outline-none focus:border-[#58051E]"
                  />
                </div>
                <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                  <Button type="button" variant="outline" size="sm" onClick={() => setShowAddLossModal(false)}>Cancel</Button>
                  <Button type="submit" size="sm" className="bg-red-700 hover:bg-red-800 text-white">Log Incident</Button>
                </div>
              </form>
            </motion.div>
          </>
        )}
      </AnimatePresence>

    </div>
  );
};
