import React from 'react';
import { motion, type HTMLMotionProps } from 'framer-motion';
import { cn } from '../utils/cn';

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
  const baseStyles = 'inline-flex items-center justify-center font-semibold transition-all duration-150 rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-1 focus-visible:ring-[#58051E]/40 disabled:opacity-50 disabled:pointer-events-none select-none cursor-pointer tracking-tight';
  
  const variants: Record<ButtonVariant, string> = {
    primary: 'bg-[#58051E] text-white hover:bg-[#430316] active:bg-[#3E0213] shadow-xs border border-[#58051E]',
    secondary: 'bg-white text-slate-700 hover:bg-slate-50 hover:text-slate-900 active:bg-slate-100 border border-slate-200/90 shadow-2xs',
    outline: 'border border-slate-200/90 bg-transparent text-slate-700 hover:bg-slate-50 hover:text-slate-900 active:bg-slate-100',
    ghost: 'text-slate-600 hover:bg-slate-100/80 hover:text-slate-900 active:bg-slate-200/50',
    destructive: 'bg-rose-50 text-rose-700 border border-rose-200/80 hover:bg-rose-100 active:bg-rose-200/80',
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
        <div className="flex items-center justify-center gap-2">
          <svg 
            className="animate-spin h-3.5 w-3.5 text-current" 
            xmlns="http://www.w3.org/2000/svg" 
            fill="none" 
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <circle 
              className="opacity-25" 
              cx="12" 
              cy="12" 
              r="10" 
              stroke="currentColor" 
              strokeWidth="4"
            />
            <path 
              className="opacity-75" 
              fill="currentColor" 
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
          <span className="opacity-90">Processing...</span>
        </div>
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

