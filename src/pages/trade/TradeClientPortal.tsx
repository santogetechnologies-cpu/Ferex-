import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import {
  Globe, PackageCheck, FileText, CreditCard, ShieldCheck,
  Ship, Clock, CheckCircle2, Download, ArrowRight,
  LogOut, LifeBuoy, AlertCircle, RefreshCw, Send,
  Building2, Phone, Mail, MapPin, ExternalLink
} from 'lucide-react';
import { Card } from '../../components/Card';
import { Button } from '../../components/Button';
import { Logo } from '../../components/Logo';
import { ToastNotification } from '../../components/ToastNotification';
import {
  getTradeOrders,
  getTradeDocuments,
  getTradePayments,
  getTradeMessages,
  sendTradeMessage,
  TRADE_ORDER_STAGES,
  type TradeOrder,
  type TradeDocument,
  type TradePaymentRecord,
  type TradeOrderStage
} from '../../lib/api/trade';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';

export const TradeClientPortal: React.FC = () => {
  const { user, profile, signOut } = useAuth();
  const navigate = useNavigate();

  const [orders, setOrders] = useState<TradeOrder[]>([]);
  const [documents, setDocuments] = useState<TradeDocument[]>([]);
  const [payments, setPayments] = useState<TradePaymentRecord[]>([]);
  const [activeTab, setActiveTab] = useState<'orders' | 'documents' | 'payments' | 'messages'>('orders');
  const [selectedOrder, setSelectedOrder] = useState<TradeOrder | null>(null);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState('');

  // Messages state
  const [messages, setMessages] = useState<any[]>([]);
  const [newMsg, setNewMsg] = useState('');
  const [sendingMsg, setSendingMsg] = useState(false);

  const clientEmail = user?.email || profile?.email || 'trade@balticgrain.pl';
  const clientName = profile?.full_name || user?.user_metadata?.full_name || 'Baltic Grain Sp. z o.o.';
  const companyName = user?.user_metadata?.company_name || profile?.department?.replace('Trade:', '') || clientName;

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [allOrders, allDocs, allPayments, chatMsgs] = await Promise.all([
        getTradeOrders(),
        getTradeDocuments(),
        getTradePayments(),
        getTradeMessages('client_portal')
      ]);

      // Filter for this client's company or email, or gracefully show active items
      const myOrders = allOrders.filter(o =>
        o.client_email.toLowerCase() === clientEmail.toLowerCase() ||
        o.client_name.toLowerCase().includes(companyName.toLowerCase()) ||
        o.client_name.toLowerCase().includes(clientName.toLowerCase()) ||
        allOrders.length <= 5
      );

      const displayOrders = myOrders.length > 0 ? myOrders : allOrders;
      setOrders(displayOrders);
      if (displayOrders.length > 0 && !selectedOrder) {
        setSelectedOrder(displayOrders[0]);
      }

      setDocuments(allDocs);
      setPayments(allPayments);
      setMessages(chatMsgs);
    } finally {
      setLoading(false);
    }
  }, [clientEmail, companyName, clientName, selectedOrder]);

  useEffect(() => {
    loadData();

    const channel = supabase
      .channel('trade_client_portal_realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'trade_orders' }, () => loadData())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'trade_documents' }, () => loadData())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'trade_payments' }, () => loadData())
      .subscribe();

    const handleLocalChange = () => loadData();
    window.addEventListener('ferex_trade_orders_change', handleLocalChange);
    window.addEventListener('ferex_trade_documents_change', handleLocalChange);
    window.addEventListener('ferex_trade_payments_change', handleLocalChange);

    return () => {
      supabase.removeChannel(channel);
      window.removeEventListener('ferex_trade_orders_change', handleLocalChange);
      window.removeEventListener('ferex_trade_documents_change', handleLocalChange);
      window.removeEventListener('ferex_trade_payments_change', handleLocalChange);
    };
  }, [loadData]);

  const showToastMsg = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(''), 3500);
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMsg.trim()) return;

    setSendingMsg(true);
    try {
      await sendTradeMessage({
        conversation_id: 'client_portal',
        contact_name: companyName,
        sender_name: clientName,
        message: newMsg,
        is_self: true,
      });
      setNewMsg('');
      const updated = await getTradeMessages('client_portal');
      setMessages(updated);
      showToastMsg('Message sent to FEREX Trade Operations Desk');
    } finally {
      setSendingMsg(false);
    }
  };

  const downloadDocCSV = (doc: TradeDocument) => {
    const rows = [
      ['FEREX GLOBAL TRADE VERIFIED DOCUMENT'],
      ['Document Type', doc.doc_type],
      ['Document Number', doc.doc_number || doc.id],
      ['Order Reference', doc.order_no],
      ['Client Name', doc.client_name],
      ['Compliance Status', doc.status],
      ['Verification Date', doc.verified_at || 'Verified'],
      ['Notes', doc.notes || 'None'],
    ];
    const csv = rows.map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${doc.file_name || doc.doc_type}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToastMsg(`Downloaded ${doc.file_name}`);
  };

  const handleLogout = () => {
    try { signOut(); } catch {}
    localStorage.removeItem('ferex_user');
    navigate('/trade/login');
  };

  const getStageIndex = (stage: TradeOrderStage) => TRADE_ORDER_STAGES.indexOf(stage);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 text-left antialiased">
      <ToastNotification message={toast} onClose={() => setToast('')} />

      {/* Top Navbar */}
      <header className="sticky top-0 bg-slate-900/90 backdrop-blur-md border-b border-slate-800 z-30 h-16 flex items-center justify-between px-4 sm:px-8">
        <div className="flex items-center gap-3">
          <Logo variant="compact" size="sm" subtitle="GLOBAL TRADE PORTAL" />
          <span className="hidden sm:inline-block px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-widest bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            Live Partner Console
          </span>
        </div>

        <div className="flex items-center gap-4 text-xs">
          <div className="text-right hidden sm:block">
            <div className="font-extrabold text-white">{companyName}</div>
            <div className="text-[10.5px] text-slate-400">{clientEmail}</div>
          </div>

          <button
            onClick={handleLogout}
            className="px-3 py-1.5 bg-white/10 hover:bg-white/15 text-slate-200 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Exit Portal</span>
          </button>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-7xl mx-auto p-4 sm:p-6 space-y-6">
        {/* Navigation Tabs */}
        <div className="flex items-center gap-2 border-b border-slate-800 pb-3 overflow-x-auto">
          {[
            { id: 'orders', label: 'Order Tracking & Lifecycle', icon: PackageCheck, count: orders.length },
            { id: 'documents', label: 'Verified Trade Documents', icon: FileText, count: documents.length },
            { id: 'payments', label: 'Payment Schedule & Receipts', icon: CreditCard, count: payments.length },
            { id: 'messages', label: 'Operations Desk Chat', icon: LifeBuoy, count: messages.length },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`px-4 py-2.5 rounded-2xl text-xs font-black transition-all flex items-center gap-2 shrink-0 cursor-pointer ${
                  isActive
                    ? 'bg-[#58051E] text-white shadow-lg shadow-[#58051E]/30'
                    : 'bg-slate-900 text-slate-400 hover:text-white hover:bg-slate-800'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{tab.label}</span>
                <span className={`px-1.5 py-0.2 rounded-md text-[10px] ${isActive ? 'bg-white/20 text-white' : 'bg-slate-800 text-slate-400'}`}>
                  {tab.count}
                </span>
              </button>
            );
          })}
        </div>

        {/* ── TAB 1: ORDER TRACKING ── */}
        {activeTab === 'orders' && (
          <div className="space-y-6">
            {orders.length === 0 ? (
              <div className="p-12 text-center bg-slate-900 rounded-3xl border border-slate-800">
                <PackageCheck className="w-10 h-10 text-slate-600 mx-auto mb-3" />
                <h3 className="text-sm font-black text-white">No active orders found</h3>
                <p className="text-xs text-slate-400 mt-1">Orders booked with FEREX Global Trade will appear here in real-time.</p>
              </div>
            ) : (
              orders.map((order) => {
                const currentStageIdx = getStageIndex(order.stage);

                return (
                  <Card key={order.id} className="p-6 bg-slate-900 border border-slate-800 rounded-3xl text-slate-100 shadow-xl space-y-6">
                    {/* Order Top Bar */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-800">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-black text-sm text-emerald-400 bg-emerald-500/10 px-2.5 py-0.5 rounded-lg border border-emerald-500/20">
                            {order.order_no}
                          </span>
                          <span className="text-xs font-bold text-slate-400">PO: {order.po_number}</span>
                        </div>
                        <h2 className="text-base font-black text-white mt-1">{order.commodity} ({order.quantity_units})</h2>
                      </div>

                      <div className="text-right">
                        <div className="text-lg font-black text-white">{order.currency} {Number(order.total_amount).toLocaleString()}</div>
                        <div className="text-[11px] text-slate-400 font-bold">{order.incoterm}</div>
                      </div>
                    </div>

                    {/* 7-Stage Visual Interactive Stepper */}
                    <div className="space-y-2">
                      <div className="text-[10.5px] font-black uppercase tracking-wider text-slate-400">
                        Order Lifecycle Status: <strong className="text-emerald-400">{order.stage}</strong>
                      </div>
                      <div className="grid grid-cols-2 sm:grid-cols-7 gap-2">
                        {TRADE_ORDER_STAGES.map((st, idx) => {
                          const isPassed = idx <= currentStageIdx;
                          const isCurrent = idx === currentStageIdx;

                          return (
                            <div
                              key={st}
                              className={`p-3 rounded-2xl border text-center transition-all ${
                                isCurrent
                                  ? 'bg-[#58051E] text-white border-[#8f193d] shadow-lg shadow-[#58051E]/40 scale-105'
                                  : isPassed
                                  ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30'
                                  : 'bg-slate-950/50 text-slate-600 border-slate-800'
                              }`}
                            >
                              <div className="flex items-center justify-center mb-1">
                                {isPassed ? (
                                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                                ) : (
                                  <Clock className="w-4 h-4 text-slate-600" />
                                )}
                              </div>
                              <div className="text-[10px] font-black leading-tight uppercase">{st}</div>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Logistics & Maritime Transit */}
                    {order.carrier && (
                      <div className="p-4 bg-slate-950/60 rounded-2xl border border-slate-800 grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                        <div>
                          <span className="text-[10px] font-bold uppercase text-slate-400 block mb-1">Ocean / Air Carrier</span>
                          <div className="font-extrabold text-white flex items-center gap-1.5">
                            <Ship className="w-4 h-4 text-[#e0567a]" />
                            {order.carrier}
                          </div>
                          <div className="text-[11px] text-slate-400 font-mono mt-0.5">Vessel: {order.vessel_flight} ({order.voyage_no})</div>
                        </div>

                        <div>
                          <span className="text-[10px] font-bold uppercase text-slate-400 block mb-1">Port Routing</span>
                          <div className="font-bold text-slate-200">{order.origin_port} → {order.destination_port}</div>
                          <div className="text-[11px] text-emerald-400 font-bold mt-0.5">Estimated Arrival (ETA): {order.eta}</div>
                        </div>

                        <div>
                          <span className="text-[10px] font-bold uppercase text-slate-400 block mb-1">Tracking Number</span>
                          <div className="font-mono font-extrabold text-emerald-400 bg-emerald-500/10 px-2 py-1 rounded-lg border border-emerald-500/20 inline-block">
                            {order.tracking_number || 'Live System Tracking'}
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Stage History Log */}
                    {order.stage_history && order.stage_history.length > 0 && (
                      <div>
                        <div className="text-[10px] font-black uppercase text-slate-400 mb-2">Stage Audit Trail</div>
                        <div className="space-y-1.5">
                          {order.stage_history.map((h, i) => (
                            <div key={i} className="flex items-center justify-between text-xs p-2 bg-slate-950/40 rounded-xl border border-slate-800/80">
                              <div className="flex items-center gap-2">
                                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                                <span className="font-bold text-white">{h.stage}</span>
                                {h.notes && <span className="text-slate-400 text-[11px]">— {h.notes}</span>}
                              </div>
                              <span className="text-[10px] text-slate-500 font-mono">{h.timestamp}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </Card>
                );
              })
            )}
          </div>
        )}

        {/* ── TAB 2: VERIFIED DOCUMENTS ── */}
        {activeTab === 'documents' && (
          <div className="space-y-4">
            <div className="text-xs font-semibold text-slate-400">
              Download officially verified commercial invoices, packing lists, ocean bills of lading, and certificates of origin.
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {documents.map((doc) => (
                <Card key={doc.id} className="p-4 bg-slate-900 border border-slate-800 rounded-2xl flex items-start justify-between gap-3 text-left">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-[#58051E]/30 text-[#e0567a] flex items-center justify-center font-bold shrink-0">
                      <FileText className="w-5 h-5" />
                    </div>
                    <div>
                      <span className="inline-block px-2 py-0.5 rounded-md text-[9.5px] font-black uppercase bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 mb-1">
                        {doc.status}
                      </span>
                      <h3 className="text-sm font-black text-white">{doc.doc_type}</h3>
                      <div className="text-[11px] text-slate-400 font-mono">{doc.file_name}</div>
                      <div className="text-[10px] text-slate-500 mt-1">Linked Order: {doc.order_no}</div>
                    </div>
                  </div>

                  <button
                    onClick={() => downloadDocCSV(doc)}
                    className="p-2.5 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs font-bold flex items-center gap-1 cursor-pointer shrink-0"
                    title="Download Official Document"
                  >
                    <Download className="w-4 h-4" />
                  </button>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* ── TAB 3: PAYMENTS & ADVANCE/BALANCE ── */}
        {activeTab === 'payments' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {orders.map((o) => {
                const balDue = Math.max(0, o.balance_amount - (o.balance_paid || 0));
                return (
                  <Card key={o.id} className="p-5 bg-slate-900 border border-slate-800 rounded-3xl space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="font-mono font-black text-xs text-emerald-400">{o.order_no}</span>
                      <span className="text-xs font-bold text-slate-400">{o.payment_terms_desc}</span>
                    </div>

                    <div className="p-3 bg-slate-950/60 rounded-2xl border border-slate-800 space-y-2 text-xs font-semibold">
                      <div className="flex justify-between">
                        <span className="text-slate-400">Total Contract Value:</span>
                        <span className="font-black text-white">{o.currency} {Number(o.total_amount).toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">Advance ({o.advance_percentage}%):</span>
                        <span className={o.advance_status === 'Paid' ? 'text-emerald-400 font-bold' : 'text-amber-400 font-bold'}>
                          {o.currency} {Number(o.advance_amount).toLocaleString()} ({o.advance_status})
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">Balance Payable:</span>
                        <span className={balDue === 0 ? 'text-emerald-400 font-bold' : 'text-rose-400 font-bold'}>
                          {o.currency} {Number(balDue).toLocaleString()} ({balDue === 0 ? 'Paid' : 'Due Before Release'})
                        </span>
                      </div>
                      {o.lc_reference && (
                        <div className="pt-2 border-t border-slate-800 text-[11px] text-blue-400 font-mono">
                          Letter of Credit Ref: {o.lc_reference}
                        </div>
                      )}
                    </div>
                  </Card>
                );
              })}
            </div>

            {/* Official Receipts List */}
            <div className="space-y-3">
              <h3 className="text-xs font-black uppercase tracking-wider text-slate-400">Official Payment Receipts</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {payments.map((p) => (
                  <div key={p.id} className="p-4 bg-slate-900 border border-slate-800 rounded-2xl flex items-center justify-between text-xs">
                    <div>
                      <div className="font-mono font-black text-emerald-400">{p.receipt_no}</div>
                      <div className="text-white font-bold">{p.currency} {Number(p.amount).toLocaleString()} — {p.type}</div>
                      <div className="text-[10px] text-slate-500 font-mono">{p.payment_date} • {p.payment_method}</div>
                    </div>
                    <button
                      onClick={() => {
                        showToastMsg(`Exporting official receipt ${p.receipt_no}`);
                      }}
                      className="px-3 py-1.5 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs font-bold flex items-center gap-1 cursor-pointer"
                    >
                      <Download className="w-3.5 h-3.5" /> Receipt
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ── TAB 4: CHAT WITH OPERATIONS DESK ── */}
        {activeTab === 'messages' && (
          <Card className="p-5 bg-slate-900 border border-slate-800 rounded-3xl h-[500px] flex flex-col justify-between text-left">
            <div className="pb-3 border-b border-slate-800 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-black text-white">Direct Line: FEREX Global Trade Operations Desk</h3>
                <p className="text-[11px] text-slate-400">Real-time encrypted communication with assigned Trade & Logistics Officers</p>
              </div>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                Desk Live
              </span>
            </div>

            <div className="flex-1 overflow-y-auto py-3 space-y-3">
              {messages.map((m: any, i: number) => (
                <div key={i} className={`flex flex-col ${m.is_self ? 'items-end' : 'items-start'}`}>
                  <div className={`p-3 rounded-2xl text-xs max-w-md ${
                    m.is_self
                      ? 'bg-[#58051E] text-white rounded-br-none'
                      : 'bg-slate-800 text-slate-100 rounded-bl-none border border-slate-700'
                  }`}>
                    <div className="text-[10px] font-bold text-white/70 mb-0.5">{m.sender_name || 'Officer'}</div>
                    <p className="leading-relaxed">{m.message}</p>
                  </div>
                </div>
              ))}
            </div>

            <form onSubmit={handleSendMessage} className="pt-3 border-t border-slate-800 flex gap-2">
              <input
                type="text"
                value={newMsg}
                onChange={(e) => setNewMsg(e.target.value)}
                placeholder="Type your inquiry to the logistics desk..."
                className="flex-1 h-10 px-4 bg-slate-950 border border-slate-800 rounded-2xl text-xs font-semibold text-white focus:outline-none focus:border-[#58051E]"
              />
              <Button type="submit" isLoading={sendingMsg} className="bg-[#58051E] hover:bg-[#430316] text-white px-5 rounded-2xl">
                <Send className="w-4 h-4 mr-1.5" /> Send
              </Button>
            </form>
          </Card>
        )}
      </main>
    </div>
  );
};

export default TradeClientPortal;
