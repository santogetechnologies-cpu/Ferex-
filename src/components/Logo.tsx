import React from 'react';
import ferexLogoImg from '../assets/ferex-logo.png';

interface LogoProps {
  className?: string;
  variant?: 'full' | 'compact' | 'icon';
  color?: 'maroon' | 'white';
  size?: 'sm' | 'md' | 'lg' | 'xl';
  align?: 'left' | 'center';
  subtitle?: string;
}

export const Logo: React.FC<LogoProps> = ({
  className = '',
  size = 'md',
}) => {
  const heightClass = {
    sm: 'h-10 md:h-12',
    md: 'h-14 md:h-16',
    lg: 'h-24 md:h-28',
    xl: 'h-32 md:h-40',
  }[size];

  return (
    <div className={`inline-flex items-center justify-center select-none ${className}`}>
      <img
        src={ferexLogoImg}
        alt="FEREX EDUCATION"
        className={`${heightClass} w-auto object-contain rounded-xl shadow-xs`}
      />
    </div>
  );
};
