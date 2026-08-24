import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Clock, CheckCircle2 } from 'lucide-react';
import { Card } from '../../components/Card';
import { Button } from '../../components/Button';

export const RimiExpiryTracking: React.FC = () => {
  const [toast, setToast] = useState('');

  const [expiringStock] = useState([
    { id: 'EXP-101', product: 'Frozen Pork Ribs & Cutlets', batch: 'LOT-FZN-8812', units: '450 Packs', location: 'Mumbai Central Hub', daysLeft: 18, risk: 'High Risk (18 Days)', price: '₹420 / Pack' },
    { id: 'EXP-102', product: 'Gourmet French Vanilla Ice Cream', batch: 'LOT-FZN-7719', units: '85 Tubs', location: 'Bengaluru Hub', daysLeft: 42, risk: 'Medium Risk (42 Days)', price: '₹480 / Tub' }
  ]);

  const showToastMsg = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(''), 3000);
  };

  const handleApplyDiscount = (id: string) => {
    showToastMsg(`Applied 35% Quick Clearance Sale Discount for batch ${id}`);
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
            <Clock className="w-5 h-5 text-amber-500" /> Expiry Risk Monitor & Discount Dispatch
          </h1>
          <p className="text-xs font-semibold text-slate-500 mt-1">
            Rimi Cold Chain Console • Expiration timeline tracking, zero-waste markdown algorithms, and clearance sales.
          </p>
        </div>
        <Button size="sm" className="bg-amber-600 hover:bg-amber-700 text-xs font-bold text-white" onClick={() => showToastMsg('Automated 35% clearance sale dispatches enabled for < 30 days stock')}>
          Trigger Auto Clearance Markdown
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {expiringStock.map((item) => (
          <Card key={item.id} className="p-5 border-l-4 border-l-amber-500 border-slate-200/70 shadow-xs space-y-4 flex flex-col justify-between">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-black text-slate-400 uppercase">{item.batch}</span>
                <span className="px-2 py-0.5 rounded-full text-[9px] font-extrabold bg-amber-50 text-amber-800 border border-amber-200">{item.risk}</span>
              </div>
              <div>
                <h3 className="text-base font-black text-slate-900">{item.product}</h3>
                <p className="text-xs font-semibold text-slate-500">{item.location} · {item.units}</p>
              </div>
              <div className="p-3 bg-amber-50 rounded-xl border border-amber-100 flex items-center justify-between">
                <span className="text-xs font-extrabold text-amber-900">Standard Price: {item.price}</span>
                <span className="text-xs font-black text-amber-900">Clearance Price: ₹273 / Pack</span>
              </div>
            </div>

            <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
              <span className="text-xs font-extrabold text-amber-700">{item.daysLeft} Days Remaining</span>
              <Button size="sm" className="bg-[#6A1B2E] hover:bg-[#521221] text-xs font-bold" onClick={() => handleApplyDiscount(item.id)}>
                Apply Clearance Discount
              </Button>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
};
