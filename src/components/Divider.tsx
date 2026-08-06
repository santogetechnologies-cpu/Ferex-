import React from 'react';
import { cn } from '../utils/cn';

interface DividerProps {
  children?: React.ReactNode;
  className?: string;
}

export const Divider: React.FC<DividerProps> = ({ children, className }) => {
  return (
    <div className={cn('relative flex py-3 items-center w-full select-none', className)}>
      <div className="flex-grow border-t border-slate-200" />
      {children && (
        <span className="flex-shrink mx-4 text-xs font-semibold uppercase tracking-wider text-slate-400">
          {children}
        </span>
      )}
      <div className="flex-grow border-t border-slate-200" />
    </div>
  );
};
