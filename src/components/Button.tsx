import React from 'react';
import { motion, type HTMLMotionProps } from 'framer-motion';
import { cn } from '../utils/cn';
import { CapLoader } from './CapLoader';

export type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'destructive';
export type ButtonSize = 'xs' | 'sm' | 'md' | 'lg';

export interface ButtonProps extends HTMLMotionProps<'button'> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  isLoading?: boolean;
  icon?: React.ReactNode;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export const Button: React.FC<ButtonProps> = ({
  children,
  className,
  variant = 'primary',
  size = 'md',
  isLoading = false,
  disabled = false,
  icon,
  leftIcon,
  rightIcon,
  ...props
}) => {
  const baseStyles = 'inline-flex items-center justify-center font-semibold transition-all duration-150 rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-1 focus-visible:ring-[#5A0122]/40 disabled:opacity-50 disabled:pointer-events-none select-none cursor-pointer tracking-tight';
  
  const variants: Record<ButtonVariant, string> = {
    primary: 'bg-[#5A0122] dark:bg-rose-700 text-white hover:bg-[#68092A] dark:hover:bg-rose-600 active:bg-[#3E0213] shadow-xs border border-[#5A0122] dark:border-rose-600',
    secondary: 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 hover:text-slate-900 dark:hover:text-white active:bg-slate-100 dark:active:bg-slate-600 border border-slate-200/90 dark:border-slate-700 shadow-2xs',
    outline: 'border border-slate-200/90 dark:border-slate-700 bg-transparent text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white active:bg-slate-100',
    ghost: 'text-slate-600 dark:text-slate-300 hover:bg-slate-100/80 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white active:bg-slate-200/50',
    destructive: 'bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border border-rose-200/80 dark:border-rose-800 hover:bg-rose-100 dark:hover:bg-rose-900/60 active:bg-rose-200/80',
  };

  const sizes: Record<ButtonSize, string> = {
    xs: 'h-7 px-2.5 text-[11px] gap-1.5 rounded-lg',
    sm: 'h-8.5 px-3 text-xs gap-1.5 rounded-lg',
    md: 'h-9.5 px-4 text-xs gap-2',
    lg: 'h-11 px-5 text-sm gap-2.5',
  };

  return (
    <motion.button
      whileTap={{ scale: disabled || isLoading ? 1 : 0.98 }}
      className={cn(baseStyles, variants[variant], sizes[size], className)}
      disabled={disabled || isLoading}
      {...props}
    >
      {isLoading ? (
        <CapLoader size="xs" tone="current" />
      ) : (
        <>
          {(leftIcon || icon) && <span className="shrink-0">{leftIcon || icon}</span>}
          {children}
          {rightIcon && <span className="shrink-0">{rightIcon}</span>}
        </>
      )}
    </motion.button>
  );
};

