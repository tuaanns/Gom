import React from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { cn } from '../../lib/utils';

const palette = {
  success: {
    icon: CheckCircle2,
    bg: 'bg-success/10 border-success/40',
    iconColor: 'text-success',
  },
  error: {
    icon: AlertCircle,
    bg: 'bg-danger/10 border-danger/40',
    iconColor: 'text-danger',
  },
  info: {
    icon: Info,
    bg: 'bg-info/10 border-info/40',
    iconColor: 'text-info',
  },
  warning: {
    icon: AlertCircle,
    bg: 'bg-warning/10 border-warning/40',
    iconColor: 'text-warning',
  },
};

export const ToastContainer = ({ toasts, onDismiss }) => {
  const { t } = useTranslation();

  if (typeof document === 'undefined') return null;
  return createPortal(
    <div className="pointer-events-none fixed right-4 bottom-4 z-[10000] flex w-full max-w-sm flex-col gap-3">
      <AnimatePresence>
        {toasts.map((toastItem) => {
          const cfg = palette[toastItem.type] || palette.info;
          const Icon = cfg.icon;
          return (
            <motion.div
              key={toastItem.id}
              initial={{ opacity: 0, x: 100, y: 100 }}
              animate={{ opacity: 1, x: 0, y: 0 }}
              exit={{ opacity: 0, x: 100, y: 100 }}
              transition={{ type: 'spring', damping: 25, stiffness: 250 }}
              className={cn(
                'pointer-events-auto flex items-start gap-3 rounded-2xl border bg-surface p-4 shadow-md',
                'dark:bg-dark-surface dark:border-dark-stroke',
                cfg.bg
              )}
            >
              <Icon className={cn('mt-0.5 h-5 w-5 flex-shrink-0', cfg.iconColor)} />
              <p className="flex-1 text-sm font-medium text-navy dark:text-dark-text">
                {toastItem.isKey ? t(toastItem.message, toastItem.options) : toastItem.message}
              </p>
              <button
                type="button"
                onClick={() => onDismiss(toastItem.id)}
                className="rounded-full p-1 text-muted hover:bg-surface-alt dark:text-dark-text-muted dark:hover:bg-dark-surface-alt"
                aria-label="Dismiss"
              >
                <X size={14} />
              </button>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>,
    document.body
  );
};

export default ToastContainer;

