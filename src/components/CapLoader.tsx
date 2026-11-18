import React from 'react';

// The FEREX graduation cap, animating by itself: it floats, tilts and swings its tassel. No text, no spinner ring.
const SIZES = { xs: 18, sm: 26, md: 44, lg: 72 } as const;

export const CapLoader: React.FC<{ size?: keyof typeof SIZES; tone?: 'brand' | 'light' | 'current'; className?: string; label?: string }> = ({ size = 'md', tone = 'brand', className = '', label = 'Loading' }) => {
  const px = SIZES[size];
  const color = tone === 'light' ? '#ffffff' : 'var(--cap-color, #5A0122)';
  return (
    <span role="status" aria-label={label} className={`cap-loader inline-flex items-center justify-center ${tone === 'brand' ? 'text-[#5A0122] dark:text-white' : ''} ${className}`} style={{ width: px * 1.25, height: px }}>
      <svg width={px} height={px * 0.85} viewBox="0 0 100 85" fill="none" aria-hidden style={{ overflow: 'visible' }}>
        <g className="cap-bob">
          <path d="M50 8 L94 28 L50 48 L6 28 Z" fill={tone === 'light' ? color : 'currentColor'} />
          <path d="M26 38 V56 C26 64, 74 64, 74 56 V38" fill={tone === 'light' ? color : 'currentColor'} />
          <path d="M50 28 L94 28" stroke={tone === 'light' ? 'rgba(0,0,0,0.12)' : 'rgba(255,255,255,0.28)'} strokeWidth="2" />
          <g className="cap-tassel">
            <path d="M48 29 C40 33, 22 38, 20 49" stroke={tone === 'light' ? color : 'currentColor'} strokeWidth="3.5" strokeLinecap="round" fill="none" />
            <circle cx="19" cy="51" r="4" fill={tone === 'light' ? color : 'currentColor'} />
            <path d="M19 55 L17 68 L22 68 Z" fill={tone === 'light' ? color : 'currentColor'} />
          </g>
        </g>
        <ellipse className="cap-shadow" cx="50" cy="80" rx="26" ry="3" fill={tone === 'light' ? 'rgba(255,255,255,0.35)' : 'currentColor'} opacity="0.18" />
      </svg>
    </span>
  );
};

/** Full-screen version for page and route loading. */
export const FullScreenCap: React.FC = () => (
  <div className="min-h-screen grid place-items-center bg-[#FCF7F9] dark:bg-slate-950">
    <CapLoader size="lg" />
  </div>
);

/** A centred block for loading inside a page or panel. */
export const BlockCap: React.FC<{ className?: string }> = ({ className = '' }) => (
  <div className={`flex items-center justify-center py-10 ${className}`}><CapLoader size="md" /></div>
);
