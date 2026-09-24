import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Bell, Search, Mail, CheckCircle2, Clock, Send,
  Eye, RefreshCw, X, ShieldCheck, AlertCircle, ArrowUpRight
} from 'lucide-react';
import { Card } from '../../components/Card';
import { Button } from '../../components/Button';
import { ToastNotification } from '../../components/ToastNotification';
import {
  getTradeAutomatedEmails,
  triggerTradeAutomatedEmail,
  getTradeOrders,
  type TradeAutomatedEmail,
  type AutomatedEmailTrigger,
  type TradeOrder
} from '../../lib/api/trade';
import { supabase } from '../../lib/supabase';

const TRIGGER_LABELS: { [key in AutomatedEmailTrigger]: string } = {
  order_confirmed: 'Order Confirmed',
  document_ready: 'Document Ready / Sent',
  invoice_generated: 'Invoice Generated',
  payment_received: 'Payment Received (Receipt)',
  payment_reminder: 'Payment Reminder (Balance Due)',
  shipped: 'Shipped (Tracking Live)',
  customs_cleared: 'Customs Cleared',
  delivered: 'Delivered & Completed'
};

export const TradeNotifications: React.FC = () => {
  const [emails, setEmails] = useState<TradeAutomatedEmail[]>([]);
  const [orders, setOrders] = useState<TradeOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterTrigger, setFilterTrigger] = useState<string>('All');
  const [selectedEmail, setSelectedEmail] = useState<TradeAutomatedEmail | null>(null);
  const [showManualTriggerModal, setShowManualTriggerModal] = useState(false);
  const [toast, setToast] = useState('');

  const [triggerForm, setTriggerForm] = useState({
    trigger_type: 'order_confirmed' as AutomatedEmailTrigger,
    order_no: '',
    recipient_name: '',
    recipient_email: '',
  });

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [allEmails, allOrders] = await Promise.all([
        getTradeAutomatedEmails(),
        getTradeOrders()
      ]);
      setEmails(Array.isArray(allEmails) ? allEmails : []);
      setOrders(Array.isArray(allOrders) ? allOrders : []);
      if (allOrders.length > 0 && !triggerForm.order_no) {
        setTriggerForm(prev => ({
          ...prev,
          order_no: allOrders[0].order_no,
          recipient_name: allOrders[0].client_name,
          recipient_email: allOrders[0].client_email
        }));
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();

    const channel = supabase
      .channel('trade_emails_realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'trade_automated_emails' }, () => {
        loadData();
      })
      .subscribe();

    const handleLocalChange = () => loadData();
    window.addEventListener('ferex_trade_emails_change', handleLocalChange);

    return () => {
      supabase.removeChannel(channel);
      window.removeEventListener('ferex_trade_emails_change', handleLocalChange);
    };
  }, [loadData]);

  const showToastMsg = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(''), 3500);
  };

  const handleOrderSelect = (orderNo: string) => {
    const ord = orders.find(o => o.order_no === orderNo);
    if (ord) {
      setTriggerForm(prev => ({
        ...prev,
        order_no: orderNo,
        recipient_name: ord.client_name,
        recipient_email: ord.client_email
      }));
    }
  };

  const handleManualTriggerSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const created = await triggerTradeAutomatedEmail({
        trigger_type: triggerForm.trigger_type,
        order_no: triggerForm.order_no,
        recipient_name: triggerForm.recipient_name,
        recipient_email: triggerForm.recipient_email,
      });
      setShowManualTriggerModal(false);
      showToastMsg(`Automated email "${created?.trigger_label || 'Notice'}" dispatched to ${created?.recipient_email || 'recipient'}!`);
      await loadData();
    } catch (err: any) {
      showToastMsg(`Error: ${err.message}`);
    }
  };

  const filteredEmails = emails.filter(e => {
    const matchesSearch =
      e.order_no.toLowerCase().includes(searchQuery.toLowerCase()) ||
      e.recipient_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      e.recipient_email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      e.subject.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesTrigger = filterTrigger === 'All' || e.trigger_type === filterTrigger;
    return matchesSearch && matchesTrigger;
  });

  return (
    <div className="space-y-6 text-left antialiased">
      {/* Toast */}
      <ToastNotification message={toast} onClose={() => setToast('')} />

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-black text-slate-900 flex items-center gap-2">
            <Mail className="w-5 h-5 text-[#58051E]" />
            Automated Emails & Notification Audit Center
          </h1>
          <p className="text-xs font-semibold text-slate-500 mt-0.5">
            Full list of 8 automatic email triggers synced in real-time across order stages, payments, and documents.
          </p>
        </div>
        <Button
          size="sm"
          onClick={() => setShowManualTriggerModal(true)}
          className="bg-[#58051E] hover:bg-[#430316] text-white text-xs font-bold shadow-xs cursor-pointer"
        >
          <Send className="w-4 h-4 mr-1.5" />
          Trigger Custom Automated Email
        </Button>
      </div>

      {/* 8 Trigger Category Cards */}
      <Card className="p-3.5 border border-slate-200/80 shadow-xs overflow-x-auto">
        <div className="text-[10px] font-black uppercase text-slate-400 mb-2">Automated Triggers (Ferex Ventures SRD Page 7)</div>
        <div className="flex items-center gap-1.5 min-w-[780px]">
          <button
            onClick={() => setFilterTrigger('All')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              filterTrigger === 'All' ? 'bg-[#58051E] text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            All Triggers ({emails.length})
          </button>
          {Object.entries(TRIGGER_LABELS).map(([k, label]) => {
            const count = emails.filter(e => e.trigger_type === k).length;
            return (
              <button
                key={k}
                onClick={() => setFilterTrigger(k)}
                className={`px-2.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                  filterTrigger === k
                    ? 'bg-[#58051E] text-white'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                <span>{label}</span>
                <span className={`px-1.5 py-0.2 rounded text-[10px] ${filterTrigger === k ? 'bg-white/20 text-white' : 'bg-white text-slate-600'}`}>
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      </Card>

      {/* Search Bar */}
      <Card className="p-3 border border-slate-200/80 shadow-xs">
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search email logs, subject, recipient, order #..."
            className="w-full h-9 pl-9 pr-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:bg-white focus:outline-none focus:border-[#58051E]"
          />
        </div>
      </Card>

      {/* Email Audit Log Table */}
      {loading ? (
        <div className="p-12 text-center text-xs font-bold text-slate-400 flex items-center justify-center gap-2">
          <RefreshCw className="w-4 h-4 animate-spin text-[#58051E]" /> Loading email logs...
        </div>
      ) : filteredEmails.length === 0 ? (
        <Card className="p-12 text-center border border-dashed border-slate-200">
          <Mail className="w-10 h-10 text-slate-300 mx-auto mb-3" />
          <h3 className="text-sm font-black text-slate-800">No email logs found</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1">
            Emails are triggered automatically whenever an order is confirmed, shipped, paid, or documented.
          </p>
        </Card>
      ) : (
        <Card className="border border-slate-200/80 shadow-xs overflow-hidden p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200/80 text-[10px] font-black uppercase text-slate-500 tracking-wider">
                  <th className="py-3 px-4">Trigger Type</th>
                  <th className="py-3 px-4">Recipient & Client</th>
                  <th className="py-3 px-4">Subject & Preview</th>
                  <th className="py-3 px-4">Order #</th>
                  <th className="py-3 px-4">Timestamp</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-semibold text-slate-700">
                {filteredEmails.map((em) => (
                  <tr key={em.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="py-3 px-4">
                      <span className="font-extrabold text-slate-900 bg-slate-100 px-2 py-0.5 rounded-md text-[10.5px]">
                        {em.trigger_label}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-extrabold text-slate-900">{em.recipient_name}</div>
                      <div className="text-[10px] text-slate-400 font-mono">{em.recipient_email}</div>
                    </td>
                    <td className="py-3 px-4 max-w-[280px]">
                      <div className="font-bold text-slate-900 truncate">{em.subject}</div>
                      <div className="text-[10.5px] text-slate-400 truncate">{em.content_preview}</div>
                    </td>
                    <td className="py-3 px-4 font-mono font-black text-[#58051E]">
                      {em.order_no}
                    </td>
                    <td className="py-3 px-4 text-slate-400 font-mono text-[10px]">
                      {em.sent_at}
                    </td>
                    <td className="py-3 px-4">
                      <span className="inline-flex items-center gap-1 text-[10px] font-black text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                        <CheckCircle2 className="w-3 h-3" /> {em.status}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <button
                        onClick={() => setSelectedEmail(em)}
                        className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-bold inline-flex items-center gap-1 cursor-pointer"
                      >
                        <Eye className="w-3 h-3" /> Inspect
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* ── MANUAL TRIGGER MODAL ── */}
      <AnimatePresence>
        {showManualTriggerModal && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs z-50" onClick={() => setShowManualTriggerModal(false)} />
            <motion.div initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.96 }} className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-md bg-white rounded-3xl shadow-2xl z-50 border border-slate-100 p-6 text-left">
              <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-100">
                <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
                  <Send className="w-4 h-4 text-[#58051E]" /> Trigger Automated Client Email
                </h3>
                <button onClick={() => setShowManualTriggerModal(false)} className="p-1 text-slate-400 hover:text-slate-600 cursor-pointer"><X className="w-5 h-5" /></button>
              </div>

              <form onSubmit={handleManualTriggerSubmit} className="space-y-3.5 text-xs font-semibold">
                <div>
                  <label className="block text-[10px] font-extrabold uppercase text-slate-400 mb-1">Trigger Event *</label>
                  <select
                    value={triggerForm.trigger_type}
                    onChange={(e) => setTriggerForm({ ...triggerForm, trigger_type: e.target.value as AutomatedEmailTrigger })}
                    className="w-full h-9 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:border-[#58051E]"
                  >
                    {Object.entries(TRIGGER_LABELS).map(([k, label]) => (
                      <option key={k} value={k}>{label}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-extrabold uppercase text-slate-400 mb-1">Target Order *</label>
                  <select
                    required
                    value={triggerForm.order_no}
                    onChange={(e) => handleOrderSelect(e.target.value)}
                    className="w-full h-9 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none"
                  >
                    <option value="">-- Choose Order --</option>
                    {orders.map(o => <option key={o.id} value={o.order_no}>{o.order_no} ({o.client_name})</option>)}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-extrabold uppercase text-slate-400 mb-1">Recipient Name</label>
                    <input
                      type="text"
                      required
                      value={triggerForm.recipient_name}
                      onChange={(e) => setTriggerForm({ ...triggerForm, recipient_name: e.target.value })}
                      className="w-full h-9 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:bg-white focus:outline-none focus:border-[#58051E]"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-extrabold uppercase text-slate-400 mb-1">Recipient Email</label>
                    <input
                      type="email"
                      required
                      value={triggerForm.recipient_email}
                      onChange={(e) => setTriggerForm({ ...triggerForm, recipient_email: e.target.value })}
                      className="w-full h-9 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:bg-white focus:outline-none focus:border-[#58051E]"
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                  <Button type="button" variant="outline" size="sm" onClick={() => setShowManualTriggerModal(false)}>Cancel</Button>
                  <Button type="submit" size="sm" className="bg-[#58051E] hover:bg-[#430316] text-white">Trigger Email Now</Button>
                </div>
              </form>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* ── EMAIL PREVIEW DIALOG ── */}
      <AnimatePresence>
        {selectedEmail && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50" onClick={() => setSelectedEmail(null)} />
            <motion.div initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.96 }} className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-lg bg-white rounded-3xl shadow-2xl z-50 border border-slate-100 p-6 text-left">
              <div className="flex items-start justify-between pb-3 border-b border-slate-100">
                <div>
                  <span className="text-[10px] font-black uppercase text-[#58051E] bg-[#58051E]/10 px-2 py-0.5 rounded">
                    {selectedEmail.trigger_label}
                  </span>
                  <h3 className="text-base font-black text-slate-900 mt-1">{selectedEmail.subject}</h3>
                  <p className="text-xs text-slate-500 font-semibold">To: {selectedEmail.recipient_name} ({selectedEmail.recipient_email})</p>
                </div>
                <button onClick={() => setSelectedEmail(null)} className="p-1 text-slate-400 hover:text-slate-600"><X className="w-5 h-5" /></button>
              </div>

              <div className="py-4 space-y-3">
                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200/80 text-xs font-medium text-slate-800 whitespace-pre-line leading-relaxed font-sans">
                  {selectedEmail.content_preview}
                </div>
                <div className="flex items-center justify-between text-[11px] font-mono text-slate-400">
                  <span>Order: <strong>{selectedEmail.order_no}</strong></span>
                  <span>Sent: {selectedEmail.sent_at}</span>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 flex justify-end">
                <Button size="sm" variant="outline" onClick={() => setSelectedEmail(null)}>Close Preview</Button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};

export default TradeNotifications;
