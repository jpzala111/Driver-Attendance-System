import React from 'react';
import { useAuth } from '../../context/AuthContext';
import { CheckCircle2, AlertCircle, AlertTriangle, Info, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export const NotificationToast: React.FC = () => {
  const { toasts, removeToast } = useAuth();

  return (
    <div className="fixed top-4 right-4 z-50 flex flex-col gap-2 max-w-sm w-full pointer-events-none">
      <AnimatePresence>
        {toasts.map((toast) => {
          let bg = 'bg-slate-900/95 border-slate-700 text-slate-100';
          let icon = <Info className="w-5 h-5 text-blue-400 shrink-0" />;

          if (toast.type === 'success') {
            bg = 'bg-emerald-950/95 border-emerald-700/60 text-emerald-100';
            icon = <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />;
          } else if (toast.type === 'error') {
            bg = 'bg-rose-950/95 border-rose-700/60 text-rose-100';
            icon = <AlertCircle className="w-5 h-5 text-rose-400 shrink-0" />;
          } else if (toast.type === 'warning') {
            bg = 'bg-amber-950/95 border-amber-700/60 text-amber-100';
            icon = <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0" />;
          }

          return (
            <motion.div
              key={toast.id}
              initial={{ opacity: 0, y: -16, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.95 }}
              transition={{ duration: 0.2 }}
              className={`pointer-events-auto rounded-xl border p-3.5 shadow-2xl backdrop-blur-md flex items-start gap-3 ${bg}`}
            >
              {icon}
              <div className="flex-1 min-w-0">
                <h4 className="font-semibold text-sm leading-snug">{toast.title}</h4>
                {toast.message && (
                  <p className="text-xs mt-0.5 opacity-90 leading-relaxed break-words">{toast.message}</p>
                )}
              </div>
              <button
                onClick={() => removeToast(toast.id)}
                className="text-slate-400 hover:text-slate-200 transition-colors p-0.5 rounded"
              >
                <X className="w-4 h-4" />
              </button>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
};
