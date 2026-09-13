import React from 'react';
import { cn } from '../utils/cn';

export type BadgeVariant = 'brand' | 'success' | 'warning' | 'error' | 'info' | 'neutral';

interface BadgeProps {
  children: React.ReactNode;
  variant?: BadgeVariant;
  size?: 'xs' | 'sm' | 'md';
  showDot?: boolean;
  className?: string;
}

export const Badge: React.FC<BadgeProps> = ({
  children,
  variant = 'neutral',
  size = 'sm',
  showDot = false,
  className,
}) => {
  const variantStyles: Record<BadgeVariant, { container: string; dot: string }> = {
    brand: {
      container: 'bg-[#58051E]/8 text-[#58051E] border-[#58051E]/20 font-semibold',
      dot: 'bg-[#58051E]',
    },
    success: {
      container: 'bg-emerald-50 text-emerald-700 border-emerald-200/70 font-semibold',
      dot: 'bg-emerald-500',
    },
    warning: {
      container: 'bg-amber-50 text-amber-800 border-amber-200/70 font-semibold',
      dot: 'bg-amber-500',
    },
    error: {
      container: 'bg-rose-50 text-rose-700 border-rose-200/70 font-semibold',
      dot: 'bg-rose-500',
    },
    info: {
      container: 'bg-sky-50 text-sky-700 border-sky-200/70 font-semibold',
      dot: 'bg-sky-500',
    },
    neutral: {
      container: 'bg-slate-100 text-slate-700 border-slate-200/70 font-medium',
      dot: 'bg-slate-400',
    },
  };

  const sizeStyles = {
    xs: 'text-[9.5px] px-1.5 py-0.5 rounded gap-1',
    sm: 'text-[10.5px] px-2 py-0.5 rounded-md gap-1.5',
    md: 'text-xs px-2.5 py-1 rounded-md gap-1.5',
  };

  const selected = variantStyles[variant];

  return (
    <span
      className={cn(
        'inline-flex items-center border select-none tracking-tight leading-none',
        selected.container,
        sizeStyles[size],
        className
      )}
    >
      {showDot && (
        <span className={cn('w-1.5 h-1.5 rounded-full shrink-0', selected.dot)} />
      )}
      <span>{children}</span>
    </span>
  );
};
