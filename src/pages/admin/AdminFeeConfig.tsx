import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { DollarSign, Calendar, Percent, Layers, Save, CheckCircle2, Plus, Trash2, Sparkles, Building2, ShieldCheck, X } from 'lucide-react';
import { useFeeConfig } from '../../hooks/useFeeConfig';

export const AdminFeeConfig: React.FC = () => {
  const { config, updateConfig } = useFeeConfig();

  const [agencyFee, setAgencyFee] = useState(config.default_agency_fee || '');
  const [vfsFee, setVfsFee] = useState(config.default_vfs_fee || '');
  const [inst1Pct, setInst1Pct] = useState(config.installment_percentages?.installment_1 ?? 30);
  const [inst2Pct, setInst2Pct] = useState(config.installment_percentages?.installment_2 ?? 40);
  const [inst3Pct, setInst3Pct] = useState(config.installment_percentages?.installment_3 ?? 30);

  const [intakes, setIntakes] = useState<string[]>(config.global_active_intakes || []);
  const [newIntakeInput, setNewIntakeInput] = useState('');

  const [sampleTuition, setSampleTuition] = useState('450000');
  const [toast, setToast] = useState('');

  const totalPct = Number(inst1Pct) + Number(inst2Pct) + Number(inst3Pct);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(''), 3000);
  };

  const handleAddIntake = () => {
    if (!newIntakeInput.trim()) return;
    const val = newIntakeInput.trim();
    if (!intakes.includes(val)) {
      setIntakes(prev => [...prev, val]);
    }
    setNewIntakeInput('');
  };

  const handleSaveAll = (e: React.FormEvent) => {
    e.preventDefault();
    if (totalPct !== 100) {
      showToast(`Warning: Total installment percentage must equal 100%. Current total: ${totalPct}%`);
      return;
    }

    updateConfig({
      currency: '₹',
      default_agency_fee: agencyFee.startsWith('₹') ? agencyFee : `₹${agencyFee}`,
      default_vfs_fee: vfsFee.startsWith('₹') ? vfsFee : `₹${vfsFee}`,
      installment_percentages: {
        installment_1: Number(inst1Pct),
        installment_2: Number(inst2Pct),
        installment_3: Number(inst3Pct),
      },
      global_active_intakes: intakes,
    });

    showToast('Fee structure, INR currency, installment splits, and active intakes saved successfully!');
  };

  // Sample calculations
  const tuitionNum = parseFloat(sampleTuition) || 450000;
  const inst1Amt = Math.round(tuitionNum * (inst1Pct / 100));
  const inst2Amt = Math.round(tuitionNum * (inst2Pct / 100));
  const inst3Amt = Math.round(tuitionNum * (inst3Pct / 100));

  return (
    <div className="space-y-6 relative text-left">
      {/* Toast */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed top-6 right-6 z-50 bg-[#6A1B2E] text-white px-5 py-3.5 rounded-xl shadow-2xl text-xs font-bold flex items-center gap-2"
          >
            <Sparkles className="w-4 h-4 text-amber-300" /> {toast}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <span className="w-8 h-8 rounded-xl bg-[#6A1B2E]/10 text-[#6A1B2E] flex items-center justify-center font-bold text-sm">
              ₹
            </span>
            Fee & Intake Global Configuration
          </h1>
          <p className="text-xs font-semibold text-slate-400 mt-0.5">
            Configure system currency (INR ₹), default agency & visa fees, payment installment percentages, and active global intakes.
          </p>
        </div>

        <button
          onClick={handleSaveAll}
          className="flex items-center gap-2 h-9.5 px-5 bg-[#6A1B2E] text-white text-xs font-bold rounded-xl hover:bg-[#521221] shadow-md shadow-[#6A1B2E]/20 self-start sm:self-auto transition-all"
        >
          <Save className="w-4 h-4" /> Save Global Configuration
        </button>
      </div>

      <form onSubmit={handleSaveAll} className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* LEFT COLUMN: Default Agency, VFS Fees & Intakes */}
        <div className="space-y-6">
          {/* Section 1: Default Agency & Visa Fees in INR */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs space-y-4">
            <h3 className="text-sm font-extrabold text-slate-900 flex items-center gap-2 border-b border-slate-100 pb-3">
              <DollarSign className="w-4 h-4 text-[#6A1B2E]" /> Default Fees in INR (₹)
            </h3>

            <div className="space-y-4">
              <div>
                <label className="block text-[10px] font-extrabold text-amber-800 uppercase tracking-wider mb-1">
                  Default Agency Service Processing Fee (₹ INR)
                </label>
                <input
                  type="text"
                  value={agencyFee}
                  onChange={(e) => setAgencyFee(e.target.value)}
                  placeholder="e.g. ₹25,000"
                  className="w-full h-10 px-3.5 bg-amber-50/50 border border-amber-200 rounded-xl text-xs font-extrabold text-amber-900 focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block text-[10px] font-extrabold text-slate-500 uppercase tracking-wider mb-1">
                  Default VFS / Visa Appointment Fee (₹ INR)
                </label>
                <input
                  type="text"
                  value={vfsFee}
                  onChange={(e) => setVfsFee(e.target.value)}
                  placeholder="e.g. ₹15,000"
                  className="w-full h-10 px-3.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-extrabold text-slate-900 focus:outline-none focus:border-[#6A1B2E]/40"
                />
              </div>
            </div>
          </div>

          {/* Section 2: Global Active Intakes Configurator */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs space-y-4">
            <h3 className="text-sm font-extrabold text-slate-900 flex items-center gap-2 border-b border-slate-100 pb-3">
              <Calendar className="w-4 h-4 text-[#6A1B2E]" /> Active Global Admissions Intakes
            </h3>

            <p className="text-xs font-semibold text-slate-500">
              Manage global admissions intakes. Click the <span className="font-bold text-red-600">✕</span> icon to remove any intake.
            </p>

            <div className="flex flex-wrap gap-2">
              {intakes.map(intake => (
                <div
                  key={intake}
                  className="px-3 py-1.5 rounded-xl text-xs font-extrabold bg-[#6A1B2E] text-white border border-[#6A1B2E] shadow-xs flex items-center gap-2"
                >
                  <span>✓ {intake}</span>
                  <button
                    type="button"
                    onClick={() => setIntakes(prev => prev.filter(i => i !== intake))}
                    title={`Remove ${intake}`}
                    className="w-4 h-4 rounded-full bg-white/20 hover:bg-red-500 text-white flex items-center justify-center transition-colors"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>

            {/* Add New Intake Input */}
            <div className="flex gap-2 pt-2 border-t border-slate-100">
              <input
                type="text"
                value={newIntakeInput}
                onChange={(e) => setNewIntakeInput(e.target.value)}
                placeholder="Add custom intake (e.g. March 2026)..."
                className="flex-1 h-9 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:outline-none focus:border-[#6A1B2E]/40"
              />
              <button
                type="button"
                onClick={handleAddIntake}
                className="h-9 px-4 bg-slate-900 text-white text-xs font-bold rounded-xl hover:bg-slate-800 flex items-center gap-1"
              >
                <Plus className="w-3.5 h-3.5" /> Add
              </button>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: Installment Percentage Splits & Real-Time Calculation */}
        <div className="space-y-6">
          {/* Section 3: Payment Installment Percentage Splits */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
                <Percent className="w-4 h-4 text-[#6A1B2E]" /> Payment Installment Percentage Splits
              </h3>
              <span className={`text-xs font-black px-2.5 py-0.5 rounded-full border ${
                totalPct === 100 ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-red-50 text-red-700 border-red-200'
              }`}>
                Total: {totalPct}%
              </span>
            </div>

            <p className="text-xs font-semibold text-slate-500">
              Define the percentage breakdown for standard 3-part installment schedules.
            </p>

            <div className="space-y-3">
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between gap-4">
                <div>
                  <p className="text-xs font-bold text-slate-900">1st Installment (Deposit / Reg Fee)</p>
                  <p className="text-[10px] font-semibold text-slate-400">Due: On Offer Acceptance</p>
                </div>
                <div className="flex items-center gap-1">
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={inst1Pct}
                    onChange={(e) => setInst1Pct(Number(e.target.value))}
                    className="w-16 h-8 text-center bg-white border border-slate-300 rounded-lg text-xs font-extrabold text-[#6A1B2E]"
                  />
                  <span className="text-xs font-extrabold text-slate-600">%</span>
                </div>
              </div>

              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between gap-4">
                <div>
                  <p className="text-xs font-bold text-slate-900">2nd Installment (Semester 1 & VFS Fee)</p>
                  <p className="text-[10px] font-semibold text-slate-400">Due: Before Visa Filing</p>
                </div>
                <div className="flex items-center gap-1">
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={inst2Pct}
                    onChange={(e) => setInst2Pct(Number(e.target.value))}
                    className="w-16 h-8 text-center bg-white border border-slate-300 rounded-lg text-xs font-extrabold text-[#6A1B2E]"
                  />
                  <span className="text-xs font-extrabold text-slate-600">%</span>
                </div>
              </div>

              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between gap-4">
                <div>
                  <p className="text-xs font-bold text-slate-900">3rd Installment (Semester 2 & Agency Fee)</p>
                  <p className="text-[10px] font-semibold text-slate-400">Due: Start of Semester 2</p>
                </div>
                <div className="flex items-center gap-1">
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={inst3Pct}
                    onChange={(e) => setInst3Pct(Number(e.target.value))}
                    className="w-16 h-8 text-center bg-white border border-slate-300 rounded-lg text-xs font-extrabold text-[#6A1B2E]"
                  />
                  <span className="text-xs font-extrabold text-slate-600">%</span>
                </div>
              </div>
            </div>
          </div>

          {/* Section 4: Live INR Calculation Simulation */}
          <div className="bg-slate-900 text-white p-6 rounded-2xl shadow-lg space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-sm font-extrabold flex items-center gap-2 text-amber-300">
                <Sparkles className="w-4 h-4 text-amber-300" /> Live INR Fee Calculation Simulation
              </h3>
              <span className="text-[10px] font-bold bg-amber-400/20 text-amber-300 px-2 py-0.5 rounded border border-amber-400/30">
                INR (₹) Preview
              </span>
            </div>

            <div>
              <label className="block text-[10px] font-extrabold uppercase tracking-wider text-slate-400 mb-1">
                Enter Sample Course Tuition Fee (₹ INR)
              </label>
              <input
                type="number"
                value={sampleTuition}
                onChange={(e) => setSampleTuition(e.target.value)}
                placeholder="450000"
                className="w-full h-10 px-3 bg-slate-800 border border-slate-700 rounded-xl text-sm font-extrabold text-amber-300 focus:outline-none"
              />
            </div>

            <div className="space-y-2 text-xs font-semibold">
              <div className="flex justify-between p-2.5 bg-slate-800/70 rounded-xl border border-slate-800">
                <span>1st Installment ({inst1Pct}%):</span>
                <span className="font-extrabold text-emerald-400">₹{inst1Amt.toLocaleString('en-IN')}</span>
              </div>

              <div className="flex justify-between p-2.5 bg-slate-800/70 rounded-xl border border-slate-800">
                <span>2nd Installment ({inst2Pct}% + VFS):</span>
                <span className="font-extrabold text-emerald-400">₹{inst2Amt.toLocaleString('en-IN')} + {vfsFee}</span>
              </div>

              <div className="flex justify-between p-2.5 bg-slate-800/70 rounded-xl border border-slate-800">
                <span>3rd Installment ({inst3Pct}% + Agency):</span>
                <span className="font-extrabold text-emerald-400">₹{inst3Amt.toLocaleString('en-IN')} + {agencyFee}</span>
              </div>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
};
