import React, { useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { cn } from '../utils/cn';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
  showPasswordToggle?: boolean;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, showPasswordToggle = false, type = 'text', className, disabled, id, ...props }, ref) => {
    const [showPassword, setShowPassword] = useState(false);
    const isPassword = type === 'password';
    const inputType = isPassword && showPasswordToggle && showPassword ? 'text' : type;

    return (
      <div className={cn('w-full text-left', className)}>
        {/* Label */}
        <label 
          htmlFor={id} 
          className="block text-sm font-semibold text-slate-700 mb-1.5 select-none"
        >
          {label}
        </label>

        {/* Input Wrapper */}
        <div className="relative">
          <input
            id={id}
            ref={ref}
            type={inputType}
            disabled={disabled}
            className={cn(
              'w-full h-11 px-3.5 rounded-lg border text-base text-slate-900 bg-white placeholder-slate-400 focus:outline-none transition-all duration-200 focus:ring-2 focus:ring-offset-0 disabled:bg-slate-50 disabled:text-slate-500 disabled:cursor-not-allowed hover:border-slate-300',
              error
                ? 'border-red-300 focus:border-red-500 focus:ring-red-500/20'
                : 'border-slate-200 focus:border-[#6A1B2E] focus:ring-[#6A1B2E]/10'
            )}
            {...props}
          />

          {/* Show/Hide Password Button */}
          {isPassword && showPasswordToggle && (
            <button
              type="button"
              disabled={disabled}
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600 focus:outline-none focus:ring-2 focus:ring-primary/40 rounded transition-colors disabled:opacity-50"
              aria-label={showPassword ? 'Hide password' : 'Show password'}
            >
              {showPassword ? (
                <EyeOff className="h-5 width-5" size={20} />
              ) : (
                <Eye className="h-5 width-5" size={20} />
              )}
            </button>
          )}
        </div>

        {/* Error message */}
        {error && (
          <p className="mt-1.5 text-sm text-red-600 font-medium" role="alert">
            {error}
          </p>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';
