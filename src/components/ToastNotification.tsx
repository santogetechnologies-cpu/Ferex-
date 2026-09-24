import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  CheckCircle2, Trash2, AlertTriangle, AlertCircle,
  Info, X
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
      ? 'top-6 left-1/2 -translate-y-0 -translate-x-1/2'
      : position === 'bottom-right'
        ? 'bottom-6 right-6'
        : 'top-6 right-6 sm:top-8 sm:right-8';

  const styles = {
    delete: {
      border: 'border-rose-200/90',
      badge: 'bg-rose-50 text-rose-700 border-rose-200',
      badgeLabel: 'REMOVED',
      iconBox: 'bg-rose-50 border-rose-100 text-rose-600',
      icon: <Trash2 className="w-5 h-5 text-rose-600 shrink-0" />,
      glow: 'shadow-[0_12px_36px_-6px_rgba(244,63,94,0.18)]',
    },
    error: {
      border: 'border-rose-200/90',
      badge: 'bg-rose-50 text-rose-700 border-rose-200',
      badgeLabel: 'FAILED',
      iconBox: 'bg-rose-50 border-rose-100 text-rose-600',
      icon: <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />,
      glow: 'shadow-[0_12px_36px_-6px_rgba(225,29,72,0.18)]',
    },
    warning: {
      border: 'border-amber-200/90',
      badge: 'bg-amber-50 text-amber-700 border-amber-200',
      badgeLabel: 'ALERT',
      iconBox: 'bg-amber-50 border-amber-100 text-amber-600',
      icon: <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" />,
      glow: 'shadow-[0_12px_36px_-6px_rgba(245,158,11,0.18)]',
    },
    success: {
      border: 'border-emerald-200/90',
      badge: 'bg-emerald-50 text-emerald-700 border-emerald-200',
      badgeLabel: 'SUCCESS',
      iconBox: 'bg-emerald-50 border-emerald-100 text-emerald-600',
      icon: <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />,
      glow: 'shadow-[0_12px_36px_-6px_rgba(16,185,129,0.18)]',
    },
    info: {
      border: 'border-slate-200/90',
      badge: 'bg-blue-50 text-blue-700 border-blue-200',
      badgeLabel: 'NOTIFICATION',
      iconBox: 'bg-blue-50 border-blue-100 text-blue-600',
      icon: <Info className="w-5 h-5 text-blue-600 shrink-0" />,
      glow: 'shadow-[0_12px_36px_-6px_rgba(59,130,246,0.15)]',
    },
  }[resolvedVariant];

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -16, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: -16, scale: 0.95 }}
        transition={{ duration: 0.22, ease: 'easeOut' }}
        className={`fixed ${positionClasses} z-[9999] max-w-md min-w-[300px] w-auto select-none`}
      >
        <div
          className={`flex items-start gap-3.5 px-4.5 py-3.5 rounded-2xl bg-white text-slate-900 border ${styles.border} ${styles.glow} transition-all duration-150`}
        >
          <div className={`p-2 rounded-xl border flex items-center justify-center shrink-0 mt-0.5 ${styles.iconBox}`}>
            {styles.icon}
          </div>

          <div className="flex-1 min-w-0 pr-1 text-left">
            <div className="flex items-center gap-2 mb-1">
              <span className={`px-2 py-0.5 rounded-md text-[9.5px] font-black tracking-wider uppercase border ${styles.badge}`}>
                {styles.badgeLabel}
              </span>
            </div>
            <p className="text-slate-900 font-bold text-xs sm:text-[13px] leading-snug break-words">
              {message}
            </p>
          </div>

          {onClose && (
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors shrink-0 -mr-1 -mt-1 cursor-pointer"
              aria-label="Close notification"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </motion.div>
    </AnimatePresence>
  );
};
