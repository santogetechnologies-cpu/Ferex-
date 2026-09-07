import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { DollarSign, Calendar, Percent, Save, Plus, Sparkles, X } from 'lucide-react';
import { useFeeConfig } from '../../hooks/useFeeConfig';

export const AdminFeeConfig: React.FC = () => {
  const { config, updateConfig } = useFeeConfig();

  const [agencyFee, setAgencyFee] = useState(config.default_agency_fee || '₹15,000');
  const [vfsFee, setVfsFee] = useState(config.default_vfs_fee || '₹8,500');
  const [advanceRegInr, setAdvanceRegInr] = useState(config.advance_registration_fee_inr ?? 15000);
  const [advanceRegEur, setAdvanceRegEur] = useState(config.advance_registration_fee_eur ?? 150);

  const [countryFees, setCountryFees] = useState<Record<string, { registration_fee_inr: number; registration_fee_eur: number; description: string }>>(
    config.country_fees || {
      'Poland': { registration_fee_inr: 15000, registration_fee_eur: 150, description: 'NAWA Legalization, University Shortlisting & Visa Advisory' },
      'Germany': { registration_fee_inr: 20000, registration_fee_eur: 200, description: 'Uni-Assist Processing, APS Assistance & Blocked Account Setup' },
      'UK': { registration_fee_inr: 25000, registration_fee_eur: 250, description: 'CAS Issuance, ATAS Guidance & UKVI Priority Visa Filing' },
      'USA': { registration_fee_inr: 30000, registration_fee_eur: 320, description: 'I-20 Processing, SEVIS Guidance & Mock Visa Interview' },
      'Canada': { registration_fee_inr: 25000, registration_fee_eur: 260, description: 'PAL Verification, LOA Processing & SDS File Prep' },
      'France': { registration_fee_inr: 18000, registration_fee_eur: 190, description: 'Campus France EEF Dossier & Long Stay Student Visa' },
      'Italy': { registration_fee_inr: 18000, registration_fee_eur: 190, description: 'Universitaly Pre-enrollment & CIMEA / DOV Assistance' },
      'Hungary': { registration_fee_inr: 15000, registration_fee_eur: 150, description: 'Stipendium Hungaricum / University Direct Admission' },
    }
  );

  const [inst1Pct, setInst1Pct] = useState(config.installment_percentages?.installment_1 ?? 30);
  const [inst2Pct, setInst2Pct] = useState(config.installment_percentages?.installment_2 ?? 40);
  const [inst3Pct, setInst3Pct] = useState(config.installment_percentages?.installment_3 ?? 30);

  const [intakes, setIntakes] = useState<string[]>(config.global_active_intakes || ['October 2026', 'February 2027', 'September 2027']);
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

  const handleCountryFeeChange = (country: string, inr: number, eur: number) => {
    setCountryFees(prev => ({
      ...prev,
      [country]: {
        ...prev[country],
        registration_fee_inr: inr,
        registration_fee_eur: eur,
      }
    }));
  };

  const handleSaveAll = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (totalPct !== 100) {
      showToast(`Warning: Total installment percentage must equal 100%. Current total: ${totalPct}%`);
      return;
    }

    updateConfig({
      currency: '₹',
      default_agency_fee: agencyFee.startsWith('₹') ? agencyFee : `₹${agencyFee}`,
      default_vfs_fee: vfsFee.startsWith('₹') ? vfsFee : `₹${vfsFee}`,
      advance_registration_fee_inr: Number(advanceRegInr),
      advance_registration_fee_eur: Number(advanceRegEur),
      country_fees: countryFees,
      installment_percentages: {
        installment_1: Number(inst1Pct),
        installment_2: Number(inst2Pct),
        installment_3: Number(inst3Pct),
      },
      global_active_intakes: intakes,
    });

    showToast('Advance registration fees, country overrides, INR splits, and active intakes saved successfully!');
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
          {/* Section 1: Advance / Registration Service Fee Configuration */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
                <DollarSign className="w-4 h-4 text-[#6A1B2E]" /> Mandatory Advance & Registration Fee
              </h3>
              <span className="text-[10px] font-black px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                Student Portal Enforced
              </span>
            </div>

            <p className="text-xs font-semibold text-slate-500">
              Set the exact advance advisory / registration amount that students must pay before submitting university applications.
            </p>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[10px] font-extrabold text-[#6A1B2E] uppercase tracking-wider mb-1">
                  Advance Amount (₹ INR)
                </label>
                <input
                  type="number"
                  min="0"
                  value={advanceRegInr}
                  onChange={(e) => setAdvanceRegInr(Number(e.target.value))}
                  placeholder="15000"
                  className="w-full h-10 px-3.5 bg-rose-50/40 border border-[#6A1B2E]/30 rounded-xl text-xs font-extrabold text-[#6A1B2E] focus:outline-none focus:border-[#6A1B2E]"
                />
              </div>

              <div>
                <label className="block text-[10px] font-extrabold text-slate-500 uppercase tracking-wider mb-1">
                  Advance Amount (€ EUR)
                </label>
                <input
                  type="number"
                  min="0"
                  value={advanceRegEur}
                  onChange={(e) => setAdvanceRegEur(Number(e.target.value))}
                  placeholder="150"
                  className="w-full h-10 px-3.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-extrabold text-slate-900 focus:outline-none focus:border-[#6A1B2E]/40"
                />
              </div>
            </div>

            <div className="pt-2 border-t border-slate-100">
              <p className="text-[11px] font-extrabold text-slate-700 mb-2">Country-Specific Registration & Advisory Fee Overrides:</p>
              <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                {Object.entries(countryFees).map(([country, feeObj]) => (
                  <div key={country} className="p-2.5 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between gap-2 text-xs">
                    <div className="min-w-[90px]">
                      <span className="font-extrabold text-slate-900 block">{country}</span>
                      <span className="text-[9px] text-slate-400 font-semibold truncate block max-w-[130px]">{feeObj.description}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <div className="flex items-center gap-0.5">
                        <span className="text-[10px] font-bold text-slate-400">₹</span>
                        <input
                          type="number"
                          value={feeObj.registration_fee_inr}
                          onChange={(e) => handleCountryFeeChange(country, Number(e.target.value), feeObj.registration_fee_eur)}
                          className="w-18 h-7 text-center bg-white border border-slate-200 rounded-lg text-xs font-bold text-[#6A1B2E]"
                        />
                      </div>
                      <div className="flex items-center gap-0.5">
                        <span className="text-[10px] font-bold text-slate-400">€</span>
                        <input
                          type="number"
                          value={feeObj.registration_fee_eur}
                          onChange={(e) => handleCountryFeeChange(country, feeObj.registration_fee_inr, Number(e.target.value))}
                          className="w-14 h-7 text-center bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-700"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Section 2: Default Agency & Visa Fees in INR */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs space-y-4">
            <h3 className="text-sm font-extrabold text-slate-900 flex items-center gap-2 border-b border-slate-100 pb-3">
              <DollarSign className="w-4 h-4 text-[#6A1B2E]" /> Additional Service & Embassy Fees
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
