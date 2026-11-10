import React, { useState, useMemo } from 'react';
import { Product } from '../types';
import { useComparison } from '../context/ComparisonContext';
import { useCart } from '../context/CartContext';
import { formatZAR } from '../utils/calculations';
import {
  extractSpecGroups,
  extractKeyAttributes,
  MAX_COMPARE_PRODUCTS,
} from '../utils/comparison';
import {
  X,
  Plus,
  Scale,
  ShoppingBag,
  Eye,
  Check,
  AlertCircle,
  Sparkles,
  Printer,
  ChevronDown,
  Trash2,
  ExternalLink,
  Layers,
  Search,
} from 'lucide-react';

interface ProductComparisonModalProps {
  isOpen: boolean;
  onClose: () => void;
  allProducts: Product[];
  onSelectProduct: (product: Product) => void;
}

export const ProductComparisonModal: React.FC<ProductComparisonModalProps> = ({
  isOpen,
  onClose,
  allProducts,
  onSelectProduct,
}) => {
  const {
    comparedProducts,
    removeFromCompare,
    clearCompare,
    addToCompare,
    isInCompare,
  } = useComparison();

  const { addItem, isInWishlist, toggleWishlist } = useCart();

  const [highlightDifferences, setHighlightDifferences] = useState<boolean>(true);
  const [onlyShowDifferences, setOnlyShowDifferences] = useState<boolean>(false);
  const [activeSlotSearch, setActiveSlotSearch] = useState<number | null>(null);
  const [searchFilter, setSearchFilter] = useState<string>('');
  const [addedItemNotice, setAddedItemNotice] = useState<string | null>(null);

  // Derive specs and attribute matrix
  const specGroups = useMemo(() => {
    return extractSpecGroups(comparedProducts);
  }, [comparedProducts]);

  const generalAttributes = useMemo(() => {
    return extractKeyAttributes(comparedProducts, formatZAR);
  }, [comparedProducts]);

  // Total differences count
  const differencesCount = useMemo(() => {
    const attrDiff = generalAttributes.filter((a) => a.isDifferent).length;
    const specDiff = specGroups.reduce((acc, g) => acc + g.rows.filter((r) => r.isDifferent).length, 0);
    return attrDiff + specDiff;
  }, [generalAttributes, specGroups]);

  // Filter available products for adding to empty slots
  const availableToAdd = useMemo(() => {
    return allProducts.filter((p) => !isInCompare(p.id) && p.isActive);
  }, [allProducts, isInCompare]);

  const filteredAvailableToAdd = useMemo(() => {
    if (!searchFilter.trim()) return availableToAdd;
    const q = searchFilter.toLowerCase();
    return availableToAdd.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        p.brand.toLowerCase().includes(q) ||
        p.category.toLowerCase().includes(q)
    );
  }, [availableToAdd, searchFilter]);

  if (!isOpen) return null;

  const handleAddToCart = (product: Product) => {
    addItem(product);
    setAddedItemNotice(product.id);
    setTimeout(() => {
      setAddedItemNotice(null);
    }, 2200);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="compare-modal-title"
      className="fixed inset-0 z-50 overflow-y-auto bg-neutral-950/75 backdrop-blur-md flex items-center justify-center p-2 sm:p-4 md:p-6 animate-in fade-in duration-200"
    >
      <div className="relative bg-white rounded-2xl w-full max-w-6xl shadow-2xl border border-neutral-200 overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header Bar */}
        <div className="bg-neutral-900 text-white px-5 py-4 flex flex-wrap items-center justify-between gap-3 shrink-0 border-b border-neutral-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-orange-500 to-amber-600 flex items-center justify-center text-white shadow-md shrink-0">
              <Scale className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 id="compare-modal-title" className="text-base sm:text-lg font-bold text-white tracking-tight">
                  Technical Specifications Comparison
                </h2>
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-neutral-800 text-orange-400 border border-neutral-700">
                  {comparedProducts.length} of {MAX_COMPARE_PRODUCTS} selected
                </span>
              </div>
              <p className="text-xs text-neutral-400 mt-0.5">
                Side-by-side hardware evaluation bench tested at Sandton Depot
              </p>
            </div>
          </div>

          {/* Header Controls */}
          <div className="flex items-center gap-2 sm:gap-3">
            {comparedProducts.length > 1 && (
              <div className="flex items-center gap-2 bg-neutral-800/90 rounded-lg p-1 border border-neutral-700">
                <button
                  type="button"
                  onClick={() => setHighlightDifferences(!highlightDifferences)}
                  className={`text-xs font-medium px-2.5 py-1 rounded transition-colors flex items-center gap-1.5 cursor-pointer ${
                    highlightDifferences
                      ? 'bg-orange-600 text-white shadow-xs'
                      : 'text-neutral-300 hover:text-white'
                  }`}
                  title="Highlight specs that differ across selected products"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Highlight</span> Differences
                  {differencesCount > 0 && (
                    <span className="bg-orange-800/80 text-[10px] px-1.5 py-0.2 rounded-full font-bold">
                      {differencesCount}
                    </span>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => setOnlyShowDifferences(!onlyShowDifferences)}
                  className={`text-xs font-medium px-2.5 py-1 rounded transition-colors cursor-pointer hidden md:flex items-center gap-1.5 ${
                    onlyShowDifferences
                      ? 'bg-neutral-700 text-white'
                      : 'text-neutral-400 hover:text-neutral-200'
                  }`}
                >
                  <span>Differences only</span>
                </button>
              </div>
            )}

            {comparedProducts.length > 0 && (
              <>
                <button
                  type="button"
                  onClick={handlePrint}
                  className="p-2 text-neutral-400 hover:text-white hover:bg-neutral-800 rounded-lg transition-colors cursor-pointer"
                  title="Print comparison chart"
                  aria-label="Print comparison chart"
                >
                  <Printer className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={clearCompare}
                  className="text-xs text-neutral-400 hover:text-rose-400 px-2 py-1.5 hover:bg-neutral-800 rounded-lg transition-colors flex items-center gap-1 cursor-pointer"
                  title="Clear all compared items"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Clear</span>
                </button>
              </>
            )}

            <button
              type="button"
              onClick={onClose}
              className="p-2 text-neutral-400 hover:text-white hover:bg-neutral-800 rounded-lg transition-colors cursor-pointer ml-1"
              aria-label="Close comparison modal"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Scrollable Body */}
        <div className="overflow-y-auto flex-1 p-4 sm:p-6 space-y-6">
          {/* Empty State */}
          {comparedProducts.length === 0 ? (
            <div className="py-16 px-4 text-center max-w-md mx-auto">
              <div className="w-16 h-16 rounded-2xl bg-orange-50 border border-orange-200 text-orange-600 flex items-center justify-center mx-auto mb-4 shadow-inner">
                <Scale className="w-8 h-8" />
              </div>
              <h3 className="text-lg font-bold text-neutral-900 mb-2">No Products Selected</h3>
              <p className="text-xs text-neutral-500 mb-6">
                Choose up to 3 products from our catalog to compare processors, displays, battery life,
                and warranties side-by-side.
              </p>
              <div className="text-left space-y-2">
                <p className="text-[11px] font-bold uppercase tracking-wider text-neutral-400">
                  Quick Picks to Compare:
                </p>
                <div className="grid grid-cols-1 gap-2">
                  {allProducts.slice(0, 3).map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => addToCompare(p)}
                      className="p-3 rounded-xl border border-neutral-200 hover:border-orange-500 hover:bg-orange-50/50 transition-all flex items-center justify-between text-left group cursor-pointer"
                    >
                      <div className="flex items-center gap-3">
                        <img
                          src={p.primaryImage}
                          alt={p.name}
                          className="w-10 h-10 object-cover rounded-lg bg-neutral-100"
                        />
                        <div>
                          <p className="text-xs font-bold text-neutral-900 group-hover:text-orange-700">
                            {p.name}
                          </p>
                          <p className="text-[11px] text-neutral-500">
                            {formatZAR(p.promotionalPriceCents || p.priceCents)}
                          </p>
                        </div>
                      </div>
                      <span className="text-xs font-semibold text-orange-600 bg-orange-100 px-2.5 py-1 rounded-lg flex items-center gap-1 group-hover:bg-orange-600 group-hover:text-white transition-colors">
                        <Plus className="w-3.5 h-3.5" />
                        <span>Add</span>
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <>
              {/* Product Card Headers Column Grid */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Render Selected Products */}
                {comparedProducts.map((product, idx) => {
                  const currentPrice = product.promotionalPriceCents || product.priceCents;
                  const hasDiscount = Boolean(
                    product.promotionalPriceCents && product.promotionalPriceCents < product.priceCents
                  );
                  const availableStock = product.onHandQuantity - (product.reservedQuantity || 0);
                  const isOutOfStock = availableStock <= 0;
                  const isLowStock = availableStock > 0 && availableStock <= product.lowStockThreshold;

                  return (
                    <div
                      key={product.id}
                      className="relative bg-white rounded-xl border-2 border-neutral-200 hover:border-orange-400 p-4 flex flex-col justify-between shadow-sm transition-all"
                    >
                      {/* Top Action: Remove Button */}
                      <button
                        type="button"
                        onClick={() => removeFromCompare(product.id)}
                        className="absolute top-3 right-3 p-1.5 rounded-full bg-neutral-100 hover:bg-rose-100 text-neutral-400 hover:text-rose-600 transition-colors cursor-pointer z-10"
                        title="Remove from comparison"
                        aria-label={`Remove ${product.name} from comparison`}
                      >
                        <X className="w-4 h-4" />
                      </button>

                      {/* Product Thumbnail & Basic Info */}
                      <div>
                        <div
                          onClick={() => {
                            onClose();
                            onSelectProduct(product);
                          }}
                          className="aspect-16/10 bg-neutral-50 rounded-lg overflow-hidden mb-3 cursor-pointer group flex items-center justify-center relative"
                        >
                          <img
                            src={product.primaryImage}
                            alt={product.name}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                          />
                          <div className="absolute inset-0 bg-neutral-900/10 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                            <span className="bg-white/95 text-neutral-900 text-[11px] font-bold px-2.5 py-1 rounded shadow-xs flex items-center gap-1">
                              <Eye className="w-3 h-3" />
                              View Page
                            </span>
                          </div>
                        </div>

                        <div className="space-y-1">
                          <span className="text-[10px] font-bold text-orange-600 uppercase tracking-wider">
                            {product.brand}
                          </span>
                          <h3
                            onClick={() => {
                              onClose();
                              onSelectProduct(product);
                            }}
                            className="text-sm font-bold text-neutral-900 line-clamp-2 hover:text-orange-600 transition-colors cursor-pointer"
                            title={product.name}
                          >
                            {product.name}
                          </h3>
                          <p className="text-xs text-neutral-500 line-clamp-1">{product.tagline}</p>
                        </div>
                      </div>

                      {/* Price & Action Row */}
                      <div className="pt-3 mt-3 border-t border-neutral-100 space-y-2.5">
                        <div className="flex items-baseline justify-between">
                          <div>
                            <span className="text-base font-extrabold text-neutral-900 font-mono">
                              {formatZAR(currentPrice)}
                            </span>
                            {hasDiscount && (
                              <span className="ml-2 text-xs text-neutral-400 line-through font-mono">
                                {formatZAR(product.priceCents)}
                              </span>
                            )}
                          </div>
                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                              isOutOfStock
                                ? 'bg-rose-100 text-rose-700'
                                : isLowStock
                                ? 'bg-amber-100 text-amber-800'
                                : 'bg-emerald-100 text-emerald-800'
                            }`}
                          >
                            {isOutOfStock ? 'Out of Stock' : isLowStock ? 'Low Stock' : 'In Stock'}
                          </span>
                        </div>

                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            disabled={isOutOfStock}
                            onClick={() => handleAddToCart(product)}
                            className={`flex-1 py-2 px-3 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                              addedItemNotice === product.id
                                ? 'bg-emerald-600 text-white'
                                : isOutOfStock
                                ? 'bg-neutral-200 text-neutral-400 cursor-not-allowed'
                                : 'bg-neutral-900 hover:bg-orange-600 text-white shadow-xs active:scale-98'
                            }`}
                          >
                            {addedItemNotice === product.id ? (
                              <>
                                <Check className="w-3.5 h-3.5" />
                                <span>Added to Cart</span>
                              </>
                            ) : (
                              <>
                                <ShoppingBag className="w-3.5 h-3.5" />
                                <span>Add to Cart</span>
                              </>
                            )}
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              onClose();
                              onSelectProduct(product);
                            }}
                            className="p-2 border border-neutral-200 hover:border-neutral-300 hover:bg-neutral-50 rounded-lg text-neutral-600 hover:text-neutral-900 transition-colors cursor-pointer"
                            title="Open full product page"
                            aria-label={`Open details for ${product.name}`}
                          >
                            <ExternalLink className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}

                {/* Empty Add Slots if fewer than 3 products */}
                {Array.from({ length: MAX_COMPARE_PRODUCTS - comparedProducts.length }).map((_, emptyIdx) => {
                  const slotIndex = comparedProducts.length + emptyIdx;
                  const isSearching = activeSlotSearch === slotIndex;

                  return (
                    <div
                      key={`empty-slot-${emptyIdx}`}
                      className="bg-neutral-50/80 rounded-xl border-2 border-dashed border-neutral-300 hover:border-orange-400 p-6 flex flex-col items-center justify-center text-center transition-all min-h-[260px] relative"
                    >
                      {!isSearching ? (
                        <div className="space-y-3">
                          <div className="w-12 h-12 rounded-full bg-white border border-neutral-200 text-neutral-400 flex items-center justify-center mx-auto shadow-xs">
                            <Plus className="w-6 h-6 text-neutral-400" />
                          </div>
                          <div>
                            <p className="text-xs font-bold text-neutral-800">
                              Add Product {slotIndex + 1}
                            </p>
                            <p className="text-[11px] text-neutral-500 mt-0.5">
                              Select another product to compare specs side-by-side
                            </p>
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              setActiveSlotSearch(slotIndex);
                              setSearchFilter('');
                            }}
                            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-white border border-neutral-300 text-xs font-bold text-neutral-800 hover:border-orange-500 hover:text-orange-600 transition-all shadow-xs cursor-pointer"
                          >
                            <Plus className="w-3.5 h-3.5 text-orange-600" />
                            <span>Select Product</span>
                          </button>
                        </div>
                      ) : (
                        <div className="w-full h-full flex flex-col text-left space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-neutral-900">Choose Product</span>
                            <button
                              type="button"
                              onClick={() => setActiveSlotSearch(null)}
                              className="text-neutral-400 hover:text-neutral-700 p-1"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>

                          <div className="relative">
                            <Search className="w-3.5 h-3.5 text-neutral-400 absolute left-2.5 top-2.5" />
                            <input
                              type="text"
                              value={searchFilter}
                              onChange={(e) => setSearchFilter(e.target.value)}
                              placeholder="Search available models..."
                              className="w-full pl-8 pr-3 py-1.5 text-xs bg-white border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 text-neutral-900"
                              autoFocus
                            />
                          </div>

                          <div className="overflow-y-auto max-h-44 space-y-1 pr-1">
                            {filteredAvailableToAdd.length === 0 ? (
                              <p className="text-xs text-neutral-400 py-4 text-center">
                                No eligible products found
                              </p>
                            ) : (
                              filteredAvailableToAdd.map((p) => (
                                <button
                                  key={p.id}
                                  type="button"
                                  onClick={() => {
                                    addToCompare(p);
                                    setActiveSlotSearch(null);
                                  }}
                                  className="w-full p-2 rounded-lg hover:bg-orange-50 text-left flex items-center justify-between border border-transparent hover:border-orange-200 transition-colors group cursor-pointer"
                                >
                                  <div className="flex items-center gap-2 min-w-0">
                                    <img
                                      src={p.primaryImage}
                                      alt={p.name}
                                      className="w-7 h-7 object-cover rounded bg-neutral-100 shrink-0"
                                    />
                                    <div className="truncate">
                                      <p className="text-xs font-semibold text-neutral-900 truncate group-hover:text-orange-700">
                                        {p.name}
                                      </p>
                                      <p className="text-[10px] text-neutral-500">
                                        {formatZAR(p.promotionalPriceCents || p.priceCents)}
                                      </p>
                                    </div>
                                  </div>
                                  <Plus className="w-3.5 h-3.5 text-orange-600 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />
                                </button>
                              ))
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* General Overview Table Section */}
              <div className="bg-white rounded-xl border border-neutral-200 overflow-hidden shadow-xs">
                <div className="bg-neutral-100/80 px-4 py-2.5 border-b border-neutral-200 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Layers className="w-4 h-4 text-orange-600" />
                    <h4 className="text-xs font-bold text-neutral-900 uppercase tracking-wider">
                      Commercial Overview
                    </h4>
                  </div>
                </div>

                <div className="divide-y divide-neutral-100">
                  {generalAttributes
                    .filter((attr) => !onlyShowDifferences || attr.isDifferent)
                    .map((attr) => {
                      const isRowHighlighted = highlightDifferences && attr.isDifferent;
                      return (
                        <div
                          key={attr.key}
                          className={`grid grid-cols-1 md:grid-cols-4 items-center p-3 text-xs transition-colors ${
                            isRowHighlighted
                              ? 'bg-amber-50/70 border-l-4 border-l-amber-500'
                              : 'hover:bg-neutral-50/60'
                          }`}
                        >
                          <div className="md:col-span-1 font-semibold text-neutral-700 flex items-center gap-1.5 pb-1 md:pb-0">
                            <span>{attr.label}</span>
                            {isRowHighlighted && (
                              <span className="text-[9px] font-bold uppercase tracking-wider bg-amber-200/80 text-amber-900 px-1.5 py-0.2 rounded">
                                Diff
                              </span>
                            )}
                          </div>

                          <div className="md:col-span-3 grid grid-cols-1 md:grid-cols-3 gap-2">
                            {comparedProducts.map((p) => (
                              <div key={`${attr.key}-${p.id}`} className="text-neutral-900 font-medium">
                                <span className="md:hidden text-[10px] text-neutral-400 font-bold block">
                                  {p.name}:
                                </span>
                                {attr.values[p.id] || '—'}
                              </div>
                            ))}
                            {/* Fill empty columns on wide screens */}
                            {Array.from({ length: MAX_COMPARE_PRODUCTS - comparedProducts.length }).map(
                              (_, i) => (
                                <div
                                  key={`empty-col-${i}`}
                                  className="hidden md:block text-neutral-300 italic text-[11px]"
                                >
                                  —
                                </div>
                              )
                            )}
                          </div>
                        </div>
                      );
                    })}
                </div>
              </div>

              {/* Technical Specifications Groups */}
              {specGroups.map((group) => {
                const visibleRows = group.rows.filter(
                  (row) => !onlyShowDifferences || row.isDifferent
                );
                if (visibleRows.length === 0) return null;

                return (
                  <div
                    key={group.groupName}
                    className="bg-white rounded-xl border border-neutral-200 overflow-hidden shadow-xs"
                  >
                    {/* Group Header */}
                    <div className="bg-neutral-100/80 px-4 py-2.5 border-b border-neutral-200 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-orange-500"></span>
                        <h4 className="text-xs font-bold text-neutral-900 uppercase tracking-wider">
                          {group.groupName}
                        </h4>
                      </div>
                      {group.hasAnyDifference && highlightDifferences && (
                        <span className="text-[10px] text-amber-700 bg-amber-100/90 font-medium px-2 py-0.5 rounded-full border border-amber-200">
                          Differences present
                        </span>
                      )}
                    </div>

                    {/* Group Specs Rows */}
                    <div className="divide-y divide-neutral-100">
                      {visibleRows.map((row) => {
                        const isRowHighlighted = highlightDifferences && row.isDifferent;
                        return (
                          <div
                            key={row.name}
                            className={`grid grid-cols-1 md:grid-cols-4 items-center p-3 text-xs transition-colors ${
                              isRowHighlighted
                                ? 'bg-amber-50/70 border-l-4 border-l-amber-500'
                                : 'hover:bg-neutral-50/60'
                            }`}
                          >
                            <div className="md:col-span-1 font-semibold text-neutral-700 flex items-center gap-1.5 pb-1 md:pb-0">
                              <span>{row.name}</span>
                              {isRowHighlighted && (
                                <span className="text-[9px] font-bold uppercase tracking-wider bg-amber-200/80 text-amber-900 px-1.5 py-0.2 rounded">
                                  Diff
                                </span>
                              )}
                            </div>

                            <div className="md:col-span-3 grid grid-cols-1 md:grid-cols-3 gap-2">
                              {comparedProducts.map((p) => {
                                const val = row.values[p.id];
                                return (
                                  <div
                                    key={`${row.name}-${p.id}`}
                                    className={`text-neutral-900 ${
                                      val === '—' ? 'text-neutral-400 italic' : 'font-medium'
                                    }`}
                                  >
                                    <span className="md:hidden text-[10px] text-neutral-400 font-bold block">
                                      {p.name}:
                                    </span>
                                    {val}
                                  </div>
                                );
                              })}
                              {/* Empty slot column placeholders */}
                              {Array.from({ length: MAX_COMPARE_PRODUCTS - comparedProducts.length }).map(
                                (_, i) => (
                                  <div
                                    key={`empty-spec-${i}`}
                                    className="hidden md:block text-neutral-300 italic text-[11px]"
                                  >
                                    —
                                  </div>
                                )
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}

              {/* Bottom Guarantee Banner */}
              <div className="p-4 rounded-xl bg-neutral-50 border border-neutral-200 flex flex-wrap items-center justify-between gap-3 text-xs text-neutral-600">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                  <span>
                    All hardware specs are verified on physical models in our Johannesburg depot.
                  </span>
                </div>
                <div className="flex items-center gap-4 text-neutral-500 font-medium">
                  <span>Direct Sandton Dispatch</span>
                  <span>·</span>
                  <span>South African Local Warranties</span>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
