import React from 'react';

interface LogoProps {
  className?: string;
  variant?: 'full' | 'compact' | 'icon';
  color?: 'maroon' | 'white';
  size?: 'sm' | 'md' | 'lg' | 'xl';
  align?: 'left' | 'center';
}

export const Logo: React.FC<LogoProps> = ({
  className = '',
  variant = 'full',
  color = 'maroon',
  size = 'md',
  align = 'left',
}) => {
  const fillColor = color === 'white' ? '#FFFFFF' : '#6A1B2E';
  
  // Dimensions for container sizing
  const dimensions = {
    sm: { icon: 36, ferex: 'text-xl', edu: 'text-[7px]' },
    md: { icon: 48, ferex: 'text-2xl', edu: 'text-[8px]' },
    lg: { icon: 64, ferex: 'text-4xl', edu: 'text-[10px]' },
    xl: { icon: 84, ferex: 'text-5xl', edu: 'text-[12px]' },
  }[size];

  // Crisp SVG Graduation Cap matching official logo geometry
  const GraduationCapIcon = ({ width }: { width: number }) => (
    <svg
      width={width}
      height={width * 0.7}
      viewBox="0 0 100 70"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="shrink-0"
    >
      {/* 1. Mortarboard Diamond Lid */}
      <path
        d="M50 5 L92 23 L50 41 L8 23 Z"
        fill={fillColor}
      />
      
      {/* 2. Cap Skull Base (Solid curved underside) */}
      <path
        d="M30 36.5 C30 47.5, 70 47.5, 70 36.5 C70 42 63.5 46.5, 50 46.5 C36.5 46.5, 30 42, 30 36.5 Z"
        fill={fillColor}
      />
      
      {/* 3. Tassel */}
      {/* Tassel line starting at center button, curving around left edge */}
      <path
        d="M50 23 C42.5 23, 34 32.5, 34.5 43.5"
        stroke={fillColor}
        strokeWidth="2.5"
        strokeLinecap="round"
        fill="none"
      />
      
      {/* Tassel Joint Ring/Bead */}
      <circle cx="34.5" cy="45.5" r="2.5" fill={fillColor} />
      
      {/* Hanging flared threads */}
      <path
        d="M34.5 46.5 L37 60 C37 61, 30.5 65.5, 29.5 60.5 L32 46.5 Z"
        fill={fillColor}
      />
    </svg>
  );

  return (
    <div className={`flex select-none ${className}`}>
      {variant === 'icon' ? (
        <GraduationCapIcon width={dimensions.icon} />
      ) : variant === 'compact' ? (
        /* Compact horizontal layout: Cap on left, wordmark on right */
        <div className="flex items-center gap-3">
          <GraduationCapIcon width={dimensions.icon * 0.85} />
          <div className="flex flex-col text-left">
            <span
              className={`font-serif leading-none tracking-wider font-extrabold ${dimensions.ferex}`}
              style={{ color: fillColor, fontFamily: "Georgia, 'Times New Roman', serif" }}
            >
              FEREX
            </span>
            <span
              className={`font-sans font-extrabold uppercase tracking-[0.25em] leading-none mt-1.5 ${dimensions.edu}`}
              style={{ color: fillColor }}
            >
              EDUCATION
            </span>
          </div>
        </div>
      ) : (
        /* Full stacked layout matching official centered brand layout */
        <div className={`flex flex-col ${align === 'center' ? 'items-center text-center' : 'items-start text-left'}`}>
          <GraduationCapIcon width={dimensions.icon} />
          <span
            className={`font-serif tracking-widest font-extrabold mt-4 leading-none ${dimensions.ferex}`}
            style={{ color: fillColor, fontFamily: "Georgia, 'Times New Roman', serif" }}
          >
            FEREX
          </span>
          <span
            className={`font-sans font-extrabold uppercase tracking-[0.3em] leading-none mt-2.5 ${dimensions.edu}`}
            style={{ color: fillColor }}
          >
            EDUCATION
          </span>
        </div>
      )}
    </div>
  );
};
