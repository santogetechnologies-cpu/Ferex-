import React, { useState } from 'react';
import { flagCode, flagUrl } from '../lib/flags';

// A country flag as a round picture; falls back to a globe if the picture cannot load.
export const CountryFlag: React.FC<{ name: string; code?: string; className?: string }> = ({ name, code, className = '' }) => {
  const [broken, setBroken] = useState(false);
  const c = flagCode(name, code);
  if (!c || broken) return <span aria-hidden className={`flex items-center justify-center bg-slate-100 text-[0.9em] ${className}`}>🌍</span>;
  return <img src={flagUrl(c, 80)} srcSet={`${flagUrl(c, 80)} 1x, ${flagUrl(c, 160)} 2x`} alt="" loading="lazy" draggable={false} onError={() => setBroken(true)} className={`object-cover ${className}`} />;
};
