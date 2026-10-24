import React from 'react';
import { cn } from '../utils/cn';

export type BadgeVariant = 'brand' | 'success' | 'warning' | 'error' | 'info' | 'neutral';

export interface BadgeProps {
  children: React.ReactNode;
  variant?: BadgeVariant;
  size?: 'xs' | 'sm' | 'md';
  showDot?: boolean;
  dot?: boolean;
  className?: string;
}

export const Badge: React.FC<BadgeProps> = ({
  children,
  variant = 'neutral',
  size = 'sm',
  showDot = false,
  dot = false,
  className,
}) => {
  const hasDot = showDot || dot;
  const variantStyles: Record<BadgeVariant, { container: string; dot: string }> = {
    brand: {
      container: 'bg-[#58051E]/8 dark:bg-rose-950/40 text-[#58051E] dark:text-rose-300 border-[#58051E]/20 dark:border-rose-900/60 font-semibold',
      dot: 'bg-[#58051E] dark:bg-rose-400',
    },
    success: {
      container: 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-200/70 dark:border-emerald-900/60 font-semibold',
      dot: 'bg-emerald-500',
    },
    warning: {
      container: 'bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 border-amber-200/70 dark:border-amber-900/60 font-semibold',
      dot: 'bg-amber-500',
    },
    error: {
      container: 'bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border-rose-200/70 dark:border-rose-900/60 font-semibold',
      dot: 'bg-rose-500',
    },
    info: {
      container: 'bg-sky-50 dark:bg-sky-950/40 text-sky-700 dark:text-sky-300 border-sky-200/70 dark:border-sky-900/60 font-semibold',
      dot: 'bg-sky-500',
    },
    neutral: {
      container: 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200/70 dark:border-slate-700 font-medium',
      dot: 'bg-slate-400 dark:bg-slate-500',
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
      {hasDot && (
        <span className={cn('w-1.5 h-1.5 rounded-full shrink-0', selected.dot)} />
      )}
      <span>{children}</span>
    </span>
  );
};
