import React from 'react';
import { cn } from '../utils/cn';

interface CheckboxProps {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  id?: string;
  disabled?: boolean;
  className?: string;
}

export const Checkbox: React.FC<CheckboxProps> = ({
  label,
  checked,
  onChange,
  id,
  disabled = false,
  className,
}) => {
  return (
    <label
      className={cn(
        'inline-flex items-center gap-2.5 cursor-pointer select-none group',
        disabled && 'opacity-50 cursor-not-allowed',
        className
      )}
    >
      <div className="relative">
        <input
          type="checkbox"
          id={id}
          checked={checked}
          disabled={disabled}
          onChange={(e) => onChange(e.target.checked)}
          className="sr-only peer"
        />
        {/* Customized box */}
        <div
          className={cn(
            'w-5 h-5 rounded-md border border-slate-200 bg-white flex items-center justify-center transition-all duration-200',
            'peer-focus-visible:ring-2 peer-focus-visible:ring-primary peer-focus-visible:ring-offset-2',
            checked
              ? 'border-primary bg-primary text-white shadow-sm shadow-primary/10'
              : 'border-slate-300 group-hover:border-slate-400'
          )}
        >
          {/* Custom SVG Checkmark */}
          <svg
            className={cn(
              'w-3.5 h-3.5 stroke-current stroke-[3] fill-none transition-transform duration-200',
              checked ? 'scale-100' : 'scale-0'
            )}
            viewBox="0 0 12 12"
          >
            <polyline points="2.5 6.5 5 9 10 3" />
          </svg>
        </div>
      </div>
      <span className="text-sm font-medium text-slate-600 group-hover:text-slate-900 transition-colors">
        {label}
      </span>
    </label>
  );
};
