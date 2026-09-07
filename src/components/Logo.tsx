import React from 'react';

export interface LogoProps {
  className?: string;
  variant?: 'full' | 'compact' | 'icon' | 'badge' | 'white' | 'dark';
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  showSubtitle?: boolean;
  subtitle?: string;
  color?: string;
  align?: 'left' | 'center' | 'right' | string;
}

export const Logo: React.FC<LogoProps> = ({
  className = '',
  variant = 'full',
  size = 'md',
  showSubtitle = true,
  subtitle = 'EDUCATION',
  color,
  align = 'left',
}) => {
  const isWhite = variant === 'white' || color === 'white';
  const effectiveColor = isWhite ? '#ffffff' : '#58051E';

  // If variant is 'badge', render the signature burgundy rounded brand tile
  if (variant === 'badge') {
    const badgePadding = {
      xs: 'p-1.5 rounded-lg',
      sm: 'p-2 rounded-xl',
      md: 'p-3 rounded-2xl',
      lg: 'p-4 rounded-3xl',
      xl: 'p-6 rounded-3xl',
    }[size];

    return (
      <div className={`inline-flex flex-col items-center justify-center bg-[#58051E] text-white shadow-md select-none ${badgePadding} ${className}`}>
        <FerexVectorMark color="#ffffff" size={size} />
        <div className="text-center mt-1">
          <span className={`font-serif tracking-wider font-extrabold uppercase block leading-none ${
            size === 'xs' ? 'text-[11px]' : size === 'sm' ? 'text-sm' : size === 'md' ? 'text-lg' : size === 'lg' ? 'text-2xl' : 'text-3xl'
          }`}>
            FEREX
          </span>
          {showSubtitle && (
            <span className={`tracking-[0.25em] font-sans font-bold uppercase block text-white/90 ${
              size === 'xs' ? 'text-[6px] mt-0.5' : size === 'sm' ? 'text-[7.5px] mt-0.5' : size === 'md' ? 'text-[9px] mt-1' : size === 'lg' ? 'text-xs mt-1' : 'text-sm mt-1.5'
            }`}>
              {subtitle}
            </span>
          )}
        </div>
      </div>
    );
  }

  // Icon only mode
  if (variant === 'icon') {
    return (
      <div className={`inline-flex items-center justify-center select-none ${className}`}>
        <FerexVectorMark color={effectiveColor} size={size} />
      </div>
    );
  }

  const textColor = isWhite ? 'text-white' : 'text-[#58051E]';
  const subtitleColor = isWhite ? 'text-white/80' : 'text-[#58051E]/90';
  const iconColor = effectiveColor;

  const ferexSizeClass = {
    xs: 'text-xs',
    sm: 'text-sm',
    md: 'text-lg md:text-xl',
    lg: 'text-2xl md:text-3xl',
    xl: 'text-3xl md:text-4xl',
  }[size];

  const eduSizeClass = {
    xs: 'text-[6px] tracking-[0.2em]',
    sm: 'text-[7.5px] tracking-[0.22em]',
    md: 'text-[9.5px] tracking-[0.26em]',
    lg: 'text-xs tracking-[0.28em]',
    xl: 'text-sm tracking-[0.3em]',
  }[size];

  const alignClass = align === 'center' ? 'items-center text-center' : 'items-start text-left';

  return (
    <div className={`inline-flex items-center gap-2.5 select-none ${className}`}>
      {/* Signature Graduation Cap Emblem */}
      <div className="shrink-0 flex items-center justify-center">
        <FerexVectorMark color={iconColor} size={size} />
      </div>

      {/* Typography */}
      <div className={`flex flex-col justify-center leading-none ${alignClass}`}>
        <span className={`font-serif font-black uppercase tracking-wider ${textColor} ${ferexSizeClass}`}>
          FEREX
        </span>
        {showSubtitle && (
          <span className={`font-sans font-extrabold uppercase mt-0.5 ${subtitleColor} ${eduSizeClass}`}>
            {subtitle}
          </span>
        )}
      </div>
    </div>
  );
};

// Precise Vector Graduation Cap matching the uploaded logo
export const FerexVectorMark: React.FC<{ color?: string; size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' }> = ({
  color = '#58051E',
  size = 'md',
}) => {
  const pixelSize = {
    xs: 18,
    sm: 24,
    md: 32,
    lg: 44,
    xl: 60,
  }[size];

  return (
    <svg
      width={pixelSize}
      height={pixelSize}
      viewBox="0 0 100 85"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="shrink-0"
    >
      {/* Mortarboard Diamond Top */}
      <path
        d="M50 8 L94 28 L50 48 L6 28 Z"
        fill={color}
      />
      {/* Cap Skull Base */}
      <path
        d="M26 38 V56 C26 64, 74 64, 74 56 V38"
        fill={color}
      />
      {/* Tassel String */}
      <path
        d="M48 29 C40 33, 22 38, 20 49"
        stroke={color}
        strokeWidth="3.5"
        strokeLinecap="round"
        fill="none"
      />
      {/* Tassel Bobble / Knot */}
      <circle
        cx="19"
        cy="51"
        r="4"
        fill={color}
      />
      {/* Tassel Tail */}
      <path
        d="M19 55 L17 68 L22 68 Z"
        fill={color}
      />
    </svg>
  );
};
