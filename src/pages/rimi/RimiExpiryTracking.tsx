import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Clock, CheckCircle2, Zap } from 'lucide-react';
import { Card } from '../../components/Card';
import { Button } from '../../components/Button';
import { getRimiBatches, updateRimiBatchStatus } from '../../lib/api/rimi';
import { supabase } from '../../lib/supabase';

export const RimiExpiryTracking: React.FC = () => {
  const [toast, setToast] = useState('');
  const [expiringStock, setExpiringStock] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getRimiBatches();
      if (Array.isArray(data) && data.length > 0) {
        const mapped = data.map((b: any, idx: number) => {
          const exp = new Date(b.expiry_date || '2026-12-31');
          const today = new Date();
          const diffDays = Math.ceil((exp.getTime() - today.getTime()) / (1000 * 3600 * 24));
          const isHighRisk = diffDays <= 60;
          return {
            id: b.id || `EXP-${100 + idx}`,
            rawId: b.id,
            product: b.product_name,
            batch: b.batch_number,
            units: `${b.quantity_units} Units`,
            location: b.warehouse_name || 'Central Cold Hub',
            daysLeft: diffDays,
            risk: isHighRisk ? `Critical (${diffDays} Days)` : `Moderate (${diffDays} Days)`,
            riskBadge: isHighRisk ? 'bg-red-50 text-red-700 border-red-200' : 'bg-amber-50 text-amber-700 border-amber-200',
            status: b.status || 'Active'
          };
        });
        setExpiringStock(mapped);
      } else {
        setExpiringStock([
          { id: 'EXP-101', rawId: '1', product: 'Sweet Corn & Green Peas IQF (1kg)', batch: 'LOT-VG-1109', units: '180 Bags', location: 'Bengaluru South Cold Transit Depot', daysLeft: 45, risk: 'Critical (45 Days)', riskBadge: 'bg-red-50 text-red-700 border-red-200', status: 'Active' },
          { id: 'EXP-102', rawId: '2', product: 'Gourmet Chicken Nuggets (1kg)', batch: 'LOT-MT-4402', units: '320 Packs', location: 'Delhi NCR Reefer Logistics Center', daysLeft: 130, risk: 'Moderate (130 Days)', riskBadge: 'bg-amber-50 text-amber-700 border-amber-200', status: 'Active' },
        ]);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();

    const channel = supabase
      .channel('realtime_rimi_expiry')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'rimi_batches' }, () => {
        loadData();
      })
      .subscribe();

    const handleLocalChange = () => loadData();
    window.addEventListener('ferex_rimi_batches_change', handleLocalChange);

    return () => {
      supabase.removeChannel(channel);
      window.removeEventListener('ferex_rimi_batches_change', handleLocalChange);
    };
  }, [loadData]);

  const showToastMsg = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(''), 3000);
  };

  const handleApplyDiscount = async (rawId: string, batchNo: string) => {
    await updateRimiBatchStatus(rawId, 'Flash Clearance (35% Off)');
    setExpiringStock(prev => prev.map(s => s.rawId === rawId ? { ...s, status: 'Flash Clearance (35% Off)' } : s));
    showToastMsg(`Applied 35% Quick Clearance Sale for batch ${batchNo}`);
  };

  return (
    <div className="space-y-6 text-left antialiased">
      <AnimatePresence>
        {toast && (
          <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="fixed top-20 right-8 z-50 bg-[#6A1B2E] text-white text-xs font-bold px-4 py-2.5 rounded-xl shadow-xl flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            {toast}
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <Clock className="w-5 h-5 text-[#6A1B2E]" /> Expiration Risk & Shelf-Life Telemetry
          </h1>
          <p className="text-xs font-semibold text-slate-500 mt-1">
            Rimi Cold Chain Console • Proactive expiration monitoring, early clearance workflows, and FIFO batch rotation.
          </p>
        </div>
      </div>

      {loading ? (
        <div className="p-8 text-center text-xs font-bold text-slate-400">Evaluating batch shelf-life...</div>
      ) : expiringStock.length === 0 ? (
        <Card className="p-12 text-center border border-dashed border-slate-200">
          <Clock className="w-10 h-10 text-slate-300 mx-auto mb-3" />
          <h3 className="text-sm font-black text-slate-800">No expiration alerts</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1">All registered cold storage batches are well within shelf-life thresholds.</p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {expiringStock.map((s) => (
            <Card key={s.id} className="p-5 border border-slate-200/70 shadow-xs space-y-4 hover:border-slate-300 transition-all flex flex-col justify-between">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-black text-slate-400 uppercase">{s.batch}</span>
                  <span className={`px-2 py-0.5 rounded-full text-[9px] font-extrabold border ${s.riskBadge}`}>{s.risk}</span>
                </div>
                <div>
                  <h3 className="text-sm font-black text-slate-900 leading-snug">{s.product}</h3>
                  <p className="text-xs font-semibold text-slate-500 mt-1">Location: {s.location}</p>
                </div>
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 text-xs space-y-1">
                  <div className="flex justify-between">
                    <span className="text-slate-400 font-semibold">Stock Quantity:</span>
                    <span className="font-bold text-slate-900">{s.units}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400 font-semibold">Current State:</span>
                    <span className="font-extrabold text-[#6A1B2E]">{s.status}</span>
                  </div>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                <Button
                  size="sm"
                  className="w-full text-xs font-bold bg-[#6A1B2E] hover:bg-[#521221] flex items-center justify-center gap-1.5"
                  onClick={() => handleApplyDiscount(s.rawId, s.batch)}
                >
                  <Zap className="w-3.5 h-3.5" /> Trigger Flash Clearance
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};
