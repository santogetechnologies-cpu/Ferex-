import React, { useState } from 'react';
import { Sliders, Package } from 'lucide-react';
import { EducationFeeEditor } from '../../components/EducationFeeEditor';
import { CountryFeePackageBuilder } from '../../components/CountryFeePackageBuilder';

type Tab = 'fees' | 'packages';

export function AdminFeeConfig() {
  const [tab, setTab] = useState<Tab>('fees');

  return (
    <div className="space-y-6">
      {/* Tab switcher */}
      <div className="flex gap-1 p-1 bg-slate-100 rounded-2xl w-fit">
        <button
          onClick={() => setTab('fees')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black transition-all cursor-pointer ${
            tab === 'fees'
              ? 'bg-white text-[#58051E] shadow-sm border border-slate-200'
              : 'text-slate-500 hover:text-slate-700'
          }`}
        >
          <Sliders className="w-3.5 h-3.5" /> Standard Fee Configuration
        </button>
        <button
          onClick={() => setTab('packages')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black transition-all cursor-pointer ${
            tab === 'packages'
              ? 'bg-white text-[#58051E] shadow-sm border border-slate-200'
              : 'text-slate-500 hover:text-slate-700'
          }`}
        >
          <Package className="w-3.5 h-3.5" /> Country Fee Packages
        </button>
      </div>

      {/* Content */}
      {tab === 'fees' && <EducationFeeEditor />}
      {tab === 'packages' && <CountryFeePackageBuilder />}
    </div>
  );
}
