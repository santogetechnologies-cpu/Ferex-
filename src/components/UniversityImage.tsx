import React, { useState } from 'react';

// Shows a university's picture, and a designed campus illustration when no picture was set or the link is broken.
// The illustration's colours are picked from the university's name so each card looks distinct but stays the same every time.
const PALETTES: [string, string, string][] = [
  ['#3b0a1e', '#7a1638', '#f3c98b'], ['#0f2a43', '#1d5a86', '#9fd3ff'], ['#12352b', '#1f6f55', '#bfe8c6'],
  ['#2b1b4d', '#5a3aa0', '#d9c8ff'], ['#3d2a12', '#8a5a1c', '#ffe0a3'], ['#0e3340', '#167d8f', '#b6f0f2'],
];
const hash = (s: string) => { let h = 0; for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0; return h; };
const initials = (name: string) => (name || 'University').replace(/\b(of|the|and|for|de|di|du)\b/gi, ' ').split(/\s+/).filter(Boolean).slice(0, 3).map(w => w[0]!.toUpperCase()).join('');

export const UniversityFallback: React.FC<{ name: string; country?: string; className?: string }> = ({ name, country, className = '' }) => {
  const [a, b, c] = PALETTES[hash(name || 'u') % PALETTES.length];
  const id = `uf${hash(name + (country || ''))}`;
  return (
    <svg viewBox="0 0 400 180" preserveAspectRatio="xMidYMid slice" role="img" aria-label={`${name} campus illustration`} className={`w-full h-full ${className}`}>
      <defs>
        <linearGradient id={`${id}g`} x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor={a} /><stop offset="1" stopColor={b} /></linearGradient>
        <radialGradient id={`${id}s`} cx="0.82" cy="0.18" r="0.5"><stop offset="0" stopColor={c} stopOpacity="0.55" /><stop offset="1" stopColor={c} stopOpacity="0" /></radialGradient>
      </defs>
      <rect width="400" height="180" fill={`url(#${id}g)`} />
      <rect width="400" height="180" fill={`url(#${id}s)`} />
      <g fill="#fff" opacity="0.07"><circle cx="60" cy="40" r="70" /><circle cx="330" cy="170" r="90" /></g>
      {/* skyline: main hall with pediment and columns, side wings, tower */}
      <g fill="#fff" opacity="0.16">
        <rect x="40" y="118" width="70" height="62" /><rect x="290" y="112" width="74" height="68" />
        <rect x="250" y="70" width="26" height="110" /><polygon points="250,70 263,46 276,70" />
        <polygon points="130,96 200,62 270,96" /><rect x="136" y="96" width="128" height="84" />
      </g>
      <g fill={a} opacity="0.35">
        {[150, 172, 194, 216, 238].map(x => <rect key={x} x={x} y="106" width="8" height="74" rx="2" />)}
        {[52, 72, 92, 302, 322, 342].map(x => <rect key={x} x={x} y="130" width="8" height="12" rx="1" />)}
      </g>
      <rect y="176" width="400" height="4" fill="#fff" opacity="0.2" />
      <text x="24" y="42" fill="#fff" opacity="0.92" fontFamily="'Plus Jakarta Sans', Inter, sans-serif" fontWeight="800" fontSize="26" letterSpacing="1">{initials(name)}</text>
      {country && <text x="24" y="60" fill="#fff" opacity="0.7" fontFamily="Inter, sans-serif" fontWeight="600" fontSize="10" letterSpacing="2">{country.toUpperCase()}</text>}
    </svg>
  );
};

export const UniversityImage: React.FC<{ src?: string | null; name: string; country?: string; className?: string }> = ({ src, name, country, className = '' }) => {
  const [broken, setBroken] = useState(false);
  if (!src || broken) return <UniversityFallback name={name} country={country} />;
  return <img src={src} alt={name} loading="lazy" className={`w-full h-full object-cover ${className}`} onError={() => setBroken(true)} />;
};
