import React, { useState } from 'react';
import { Eye, EyeOff, AlertCircle } from 'lucide-react';
import { cn } from '../utils/cn';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  showPasswordToggle?: boolean;
  leftIcon?: React.ReactNode;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, showPasswordToggle = true, type = 'text', className, disabled, id, leftIcon, ...props }, ref) => {
    const [showPassword, setShowPassword] = useState(false);
    const isPassword = type === 'password';
    const hasToggle = isPassword && showPasswordToggle;
    const inputType = isPassword && showPasswordToggle && showPassword ? 'text' : type;

    return (
      <div className={cn('w-full text-left', className)}>
        {/* Label */}
        {label && (
          <label 
            htmlFor={id} 
            className="block text-xs font-semibold text-slate-700 mb-1.5 select-none"
          >
            {label}
          </label>
        )}

        {/* Input Wrapper */}
        <div className="relative flex items-center">
          {leftIcon && (
            <div className="absolute left-3 text-slate-400 pointer-events-none shrink-0">
              {leftIcon}
            </div>
          )}

          <input
            id={id}
            ref={ref}
            type={inputType}
            disabled={disabled}
            className={cn(
              'w-full h-10 px-3 rounded-xl border text-xs font-medium text-slate-900 bg-white placeholder-slate-400 focus:outline-none transition-all duration-150 disabled:bg-slate-50 disabled:text-slate-400 disabled:cursor-not-allowed hover:border-slate-300',
              leftIcon && 'pl-9',
              hasToggle && 'pr-9',
              error
                ? 'border-rose-300 focus:border-rose-500 focus:ring-2 focus:ring-rose-500/15'
                : 'border-slate-200/90 focus:border-[#58051E] focus:ring-2 focus:ring-[#58051E]/10'
            )}
            {...props}
          />

          {/* Show/Hide Password Button */}
          {isPassword && showPasswordToggle && (
            <button
              type="button"
              disabled={disabled}
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-2.5 p-1 text-slate-400 hover:text-slate-600 focus:outline-none rounded-lg transition-colors disabled:opacity-50 cursor-pointer"
              aria-label={showPassword ? 'Hide password' : 'Show password'}
            >
              {showPassword ? (
                <EyeOff className="h-4 w-4" />
              ) : (
                <Eye className="h-4 w-4" />
              )}
            </button>
          )}
        </div>

        {/* Error message */}
        {error && (
          <p className="mt-1.5 text-xs text-rose-600 font-medium flex items-center gap-1" role="alert">
            <AlertCircle className="w-3.5 h-3.5 shrink-0" />
            {error}
          </p>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';

