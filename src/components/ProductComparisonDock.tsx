import React, { useState } from 'react';
import { useComparison } from '../context/ComparisonContext';
import { formatZAR } from '../utils/calculations';
import { Scale, X, ArrowRight, Trash2, ChevronUp, ChevronDown, Check } from 'lucide-react';

export const ProductComparisonDock: React.FC = () => {
  const {
    comparedProducts,
    removeFromCompare,
    clearCompare,
    setIsComparisonModalOpen,
    isComparisonModalOpen,
    maxItems,
  } = useComparison();

  const [isCollapsed, setIsCollapsed] = useState(false);

  // If no items or modal is open, dock is hidden
  if (comparedProducts.length === 0 || isComparisonModalOpen) {
    return null;
  }

  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-40 w-[95%] max-w-2xl animate-in slide-in-from-bottom-5 duration-300">
      <div className="bg-neutral-900/95 backdrop-blur-md border border-neutral-700/80 rounded-2xl shadow-2xl text-white p-3 sm:p-4">
        {/* Top bar with count & collapse */}
        <div className="flex items-center justify-between pb-2 mb-2 border-b border-neutral-800">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-lg bg-orange-500/20 text-orange-400 border border-orange-500/30 flex items-center justify-center">
              <Scale className="w-3.5 h-3.5" />
            </div>
            <span className="text-xs font-bold tracking-wide">
              Product Comparison ({comparedProducts.length}/{maxItems})
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={clearCompare}
              className="text-[11px] text-neutral-400 hover:text-rose-400 transition-colors flex items-center gap-1 cursor-pointer px-1.5 py-0.5"
              title="Clear all comparison items"
            >
              <Trash2 className="w-3 h-3" />
              <span className="hidden sm:inline">Clear</span>
            </button>
            <button
              type="button"
              onClick={() => setIsCollapsed(!isCollapsed)}
              className="text-neutral-400 hover:text-white transition-colors p-1"
              aria-label={isCollapsed ? 'Expand comparison dock' : 'Collapse comparison dock'}
            >
              {isCollapsed ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* Expanded Content */}
        {!isCollapsed && (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-1">
            {/* Slots: up to 3 thumbnails */}
            <div className="flex items-center gap-2 w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0">
              {comparedProducts.map((product) => (
                <div
                  key={product.id}
                  className="relative group bg-neutral-800/90 border border-neutral-700 rounded-xl p-1.5 pr-2.5 flex items-center gap-2 shrink-0 max-w-[170px]"
                >
                  <img
                    src={product.primaryImage}
                    alt={product.name}
                    className="w-8 h-8 rounded-lg object-cover bg-neutral-900 shrink-0"
                  />
                  <div className="min-w-0">
                    <p className="text-[11px] font-bold text-white truncate">{product.name}</p>
                    <p className="text-[10px] text-orange-400 font-mono">
                      {formatZAR(product.promotionalPriceCents || product.priceCents)}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => removeFromCompare(product.id)}
                    className="p-1 rounded-full text-neutral-400 hover:text-rose-400 hover:bg-neutral-700 transition-colors ml-auto cursor-pointer"
                    title={`Remove ${product.name}`}
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}

              {/* Empty placeholder slots */}
              {Array.from({ length: maxItems - comparedProducts.length }).map((_, idx) => (
                <div
                  key={`empty-${idx}`}
                  className="w-24 h-11 border border-dashed border-neutral-700/80 rounded-xl flex items-center justify-center text-[10px] text-neutral-500 shrink-0"
                >
                  + Slot {comparedProducts.length + idx + 1}
                </div>
              ))}
            </div>

            {/* Compare Action Button */}
            <button
              type="button"
              onClick={() => setIsComparisonModalOpen(true)}
              className="w-full sm:w-auto px-4 py-2 bg-gradient-to-r from-orange-500 to-amber-600 hover:from-orange-600 hover:to-amber-700 text-white text-xs font-bold rounded-xl shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-95 shrink-0"
            >
              <span>Compare Now</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
