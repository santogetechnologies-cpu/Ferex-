import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  CheckCircle2, Trash2, AlertTriangle, AlertCircle,
  Info, X, Sparkles
} from 'lucide-react';

export type ToastVariant = 'success' | 'delete' | 'error' | 'warning' | 'info' | 'auto';

export interface ToastNotificationProps {
  message: string;
  variant?: ToastVariant;
  onClose?: () => void;
  position?: 'top-right' | 'top-center' | 'bottom-right';
}

export function getToastVariantFromMessage(msg: string): 'success' | 'delete' | 'error' | 'warning' | 'info' {
  const lower = (msg || '').toLowerCase();
  if (lower.includes('delete') || lower.includes('removed') || lower.includes('revoked') || lower.includes('purged')) {
    return 'delete';
  }
  if (lower.includes('error') || lower.includes('fail') || lower.includes('rejected') || lower.includes('invalid') || lower.includes('denied')) {
    return 'error';
  }
  if (lower.includes('warn') || lower.includes('alert') || lower.includes('expired')) {
    return 'warning';
  }
  if (
    lower.includes('success') ||
    lower.includes('created') ||
    lower.includes('added') ||
    lower.includes('saved') ||
    lower.includes('updated') ||
    lower.includes('verified') ||
    lower.includes('cleared') ||
    lower.includes('copied') ||
    lower.includes('registered') ||
    lower.includes('published') ||
    lower.includes('dispatched') ||
    lower.includes('settled') ||
    lower.includes('provisioned')
  ) {
    return 'success';
  }
  return 'info';
}

export const ToastNotification: React.FC<ToastNotificationProps> = ({
  message,
  variant = 'auto',
  onClose,
  position = 'top-right',
}) => {
  if (!message) return null;

  const resolvedVariant = variant === 'auto' ? getToastVariantFromMessage(message) : variant;

  const positionClasses =
    position === 'top-center'
      ? 'top-6 left-1/2 -translate-x-1/2'
      : position === 'bottom-right'
        ? 'bottom-6 right-6'
        : 'top-6 right-6 sm:top-8 sm:right-8';

  const styles = {
    delete: {
      border: 'border-rose-500/40 hover:border-rose-500/60',
      badge: 'bg-rose-500/15 text-rose-300 border-rose-500/30',
      badgeLabel: 'DELETED',
      icon: <Trash2 className="w-4 h-4 text-rose-400 shrink-0" />,
      glow: 'shadow-[0_10px_35px_-5px_rgba(244,63,94,0.25)]',
    },
    error: {
      border: 'border-rose-600/50 hover:border-rose-600/70',
      badge: 'bg-rose-600/20 text-rose-300 border-rose-600/30',
      badgeLabel: 'ERROR',
      icon: <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />,
      glow: 'shadow-[0_10px_35px_-5px_rgba(225,29,72,0.3)]',
    },
    warning: {
      border: 'border-amber-500/40 hover:border-amber-500/60',
      badge: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
      badgeLabel: 'ALERT',
      icon: <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />,
      glow: 'shadow-[0_10px_35px_-5px_rgba(245,158,11,0.2)]',
    },
    success: {
      border: 'border-emerald-500/40 hover:border-emerald-500/60',
      badge: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
      badgeLabel: 'SUCCESS',
      icon: <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />,
      glow: 'shadow-[0_10px_35px_-5px_rgba(16,185,129,0.25)]',
    },
    info: {
      border: 'border-slate-700 hover:border-slate-600',
      badge: 'bg-blue-500/15 text-blue-300 border-blue-500/30',
      badgeLabel: 'NOTICE',
      icon: <Info className="w-4 h-4 text-blue-400 shrink-0" />,
      glow: 'shadow-[0_10px_35px_-5px_rgba(59,130,246,0.15)]',
    },
  }[resolvedVariant];

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -16, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: -16, scale: 0.95 }}
        transition={{ duration: 0.2, ease: 'easeOut' }}
        className={`fixed ${positionClasses} z-[9999] max-w-md w-auto select-none`}
      >
        <div
          className={`flex items-center gap-3 px-4 py-3 rounded-2xl bg-slate-900/95 backdrop-blur-md text-white border text-xs font-semibold ${styles.border} ${styles.glow} transition-all duration-150`}
        >
          <div className="p-1.5 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center shrink-0">
            {styles.icon}
          </div>

          <div className="flex-1 min-w-0 pr-1 text-left">
            <div className="flex items-center gap-2 mb-0.5">
              <span className={`px-1.5 py-0.2 rounded-full text-[9px] font-black tracking-wider uppercase border ${styles.badge}`}>
                {styles.badgeLabel}
              </span>
            </div>
            <p className="text-slate-100 font-medium text-xs leading-snug break-words">
              {message}
            </p>
          </div>

          {onClose && (
            <button
              onClick={onClose}
              className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors shrink-0"
              aria-label="Close notification"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </motion.div>
    </AnimatePresence>
  );
};
