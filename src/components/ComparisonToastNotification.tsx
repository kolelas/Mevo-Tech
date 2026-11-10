import React from 'react';
import { useComparison } from '../context/ComparisonContext';
import { Scale, CheckCircle2, AlertTriangle, Info, X } from 'lucide-react';

export const ComparisonToastNotification: React.FC = () => {
  const { toast, clearToast, setIsComparisonModalOpen } = useComparison();

  if (!toast) return null;

  const isWarning = toast.type === 'warning';
  const isSuccess = toast.type === 'success';

  return (
    <div className="fixed top-20 right-4 sm:right-6 z-50 max-w-sm w-full animate-in slide-in-from-top-4 fade-in duration-200">
      <div
        className={`p-3.5 rounded-xl shadow-xl border flex items-start gap-3 backdrop-blur-md ${
          isWarning
            ? 'bg-amber-900/90 border-amber-600 text-amber-50'
            : isSuccess
            ? 'bg-neutral-900/95 border-orange-500/80 text-white'
            : 'bg-neutral-900/95 border-neutral-700 text-white'
        }`}
      >
        <div className="shrink-0 mt-0.5">
          {isWarning ? (
            <AlertTriangle className="w-4 h-4 text-amber-400" />
          ) : isSuccess ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          ) : (
            <Info className="w-4 h-4 text-orange-400" />
          )}
        </div>

        <div className="flex-1 min-w-0">
          <p className="text-xs font-medium leading-relaxed">{toast.message}</p>
          {isSuccess && (
            <button
              type="button"
              onClick={() => {
                clearToast();
                setIsComparisonModalOpen(true);
              }}
              className="text-[11px] font-bold text-orange-400 hover:text-orange-300 underline mt-1 block cursor-pointer"
            >
              Open Comparison Modal &rarr;
            </button>
          )}
        </div>

        <button
          type="button"
          onClick={clearToast}
          className="text-neutral-400 hover:text-white p-1 shrink-0"
          aria-label="Dismiss message"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};
