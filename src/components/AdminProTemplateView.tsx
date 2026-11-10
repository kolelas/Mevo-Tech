import React, { useState, useMemo } from 'react';
import {
  Tag,
  CalendarCheck,
  ChevronDown,
  ArrowUpRight,
  TrendingUp,
  RefreshCw,
  RotateCcw,
  Sparkles,
  ShieldCheck,
  PackageCheck,
  AlertCircle,
} from 'lucide-react';
import { Product, Order } from '../types';
import { computeSalesAnalytics, SalesAnalyticsSummary } from '../utils/salesAnalytics';
import { api } from '../services/api';
import { formatZAR } from '../utils/calculations';

interface AdminProTemplateViewProps {
  metrics: any;
  products: Product[];
  orders: Order[];
  onNavigateTab: (tabId: string) => void;
  currency: 'USD' | 'ZAR';
  onToggleCurrency: () => void;
  onRefreshData?: () => void;
}

export const AdminProTemplateView: React.FC<AdminProTemplateViewProps> = ({
  metrics,
  products,
  orders,
  onNavigateTab,
  currency,
  onToggleCurrency,
  onRefreshData,
}) => {
  const [timeFilter, setTimeFilter] = useState<'12 Months' | '30 days' | '7 days' | '24 hours'>('12 Months');
  const [yearSelection, setYearSelection] = useState<string>('Current year (2026)');
  const [isYearDropdownOpen, setIsYearDropdownOpen] = useState(false);
  const [hoveredBar, setHoveredBar] = useState<{ month: string; incomeCents: number; expenseCents: number; orderCount: number } | null>(null);
  const [topProductDate, setTopProductDate] = useState<string>('All Time Store Sales');
  const [isProductDateDropdownOpen, setIsProductDateDropdownOpen] = useState(false);
  const [actionNotice, setActionNotice] = useState<string | null>(null);
  const [isResetting, setIsResetting] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);

  // Authoritative analytics computed dynamically from real store orders & catalog
  const analytics: SalesAnalyticsSummary = useMemo(() => {
    return computeSalesAnalytics(orders, products, timeFilter);
  }, [orders, products, timeFilter]);

  // Helper to format currency values based on active mode
  const formatValue = (cents: number) => {
    if (cents === 0) {
      return currency === 'USD' ? '$0.00' : 'R 0.00';
    }
    if (currency === 'USD') {
      const usdVal = cents / 100 / 18.25;
      return `$${usdVal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    }
    return formatZAR(cents);
  };

  const handleResetSales = async () => {
    if (!window.confirm('Are you sure you want to reset all store sales to zero? This will purge existing orders and set all revenue figures to zero.')) {
      return;
    }
    setIsResetting(true);
    try {
      await api.adminResetSales();
      setActionNotice('All store sales have been reset to zero. Revenue displays R 0.00 / $0.00.');
      if (onRefreshData) onRefreshData();
      setTimeout(() => setActionNotice(null), 5000);
    } catch (err: any) {
      setActionNotice(`Error resetting sales: ${err.message}`);
    } finally {
      setIsResetting(false);
    }
  };

  const handleRestoreSales = async () => {
    setIsRestoring(true);
    try {
      await api.adminRestoreSales();
      setActionNotice('Real demo store orders and inventory sales restored.');
      if (onRefreshData) onRefreshData();
      setTimeout(() => setActionNotice(null), 5000);
    } catch (err: any) {
      setActionNotice(`Error restoring sales: ${err.message}`);
    } finally {
      setIsRestoring(false);
    }
  };

  // Compute maximum income bar to normalize heights dynamically
  const maxMonthlyIncome = useMemo(() => {
    let max = 0;
    for (const m of analytics.monthlyBreakdown) {
      if (m.incomeCents > max) max = m.incomeCents;
      if (m.expenseCents > max) max = m.expenseCents;
    }
    return max;
  }, [analytics.monthlyBreakdown]);

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Live Sales State & Reset Controls Bar */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-xs p-4 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-2.5">
          <div className={`w-3 h-3 rounded-full ${analytics.hasRealSales ? 'bg-emerald-500 animate-pulse' : 'bg-slate-300'}`} />
          <div>
            <span className="text-xs font-bold text-slate-800">Authoritative Store Analytics</span>
            <span className="text-[11px] text-slate-500 block">
              {analytics.hasRealSales
                ? `Live metrics computed from ${analytics.totalOrdersCount} paid orders across ${products.length} products.`
                : 'Zero Sales Mode: No sales recorded. All metrics strictly zeroed.'}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onToggleCurrency}
            className="px-3 py-1.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer"
          >
            Switch to {currency === 'USD' ? 'ZAR (South African Rand)' : 'USD ($)'}
          </button>

          <button
            type="button"
            onClick={handleResetSales}
            disabled={isResetting || !analytics.hasRealSales}
            className="px-3 py-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-xs font-bold transition-colors inline-flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            title="Reset all store sales to zero to verify zero state"
          >
            <RotateCcw className={`w-3.5 h-3.5 ${isResetting ? 'animate-spin' : ''}`} />
            <span>Reset Sales to Zero</span>
          </button>

          <button
            type="button"
            onClick={handleRestoreSales}
            disabled={isRestoring}
            className="px-3 py-1.5 rounded-xl bg-violet-50 hover:bg-violet-100 text-violet-700 border border-violet-200 text-xs font-bold transition-colors inline-flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
            title="Restore real store demo orders"
          >
            <Sparkles className={`w-3.5 h-3.5 ${isRestoring ? 'animate-spin' : ''}`} />
            <span>Restore Store Orders</span>
          </button>
        </div>
      </div>

      {actionNotice && (
        <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-medium flex items-center justify-between">
          <span>{actionNotice}</span>
          <button type="button" onClick={() => setActionNotice(null)} className="text-emerald-600 hover:text-emerald-900 font-bold">
            Dismiss
          </button>
        </div>
      )}

      {/* ============================================================== */}
      {/* ROW 1: Sales Overview (Left 8 cols) + Metric Cards (Right 4 cols) */}
      {/* ============================================================== */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* ---- LEFT 8 COLS: SALES OVERVIEW CARD ---- */}
        <div className="lg:col-span-8 bg-white rounded-2xl border border-slate-100 shadow-sm p-6 relative flex flex-col justify-between">
          {/* Card Top: Title and Date Selector Dropdown */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
            <h2 className="text-lg font-bold text-slate-800 tracking-tight">Sales Overview</h2>

            {/* Dropdown: "Current year (2026)" */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setIsYearDropdownOpen(!isYearDropdownOpen)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-xs font-medium text-slate-600 hover:border-slate-300 hover:text-slate-900 transition-colors shadow-2xs"
              >
                <span>{yearSelection}</span>
                <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
              </button>

              {isYearDropdownOpen && (
                <div className="absolute right-0 mt-1 w-44 bg-white border border-slate-100 rounded-xl shadow-xl z-20 py-1 text-xs">
                  {['Current year (2026)', 'Last year (2025)', 'All Time'].map((yr) => (
                    <button
                      key={yr}
                      onClick={() => {
                        setYearSelection(yr);
                        setIsYearDropdownOpen(false);
                      }}
                      className="w-full text-left px-3 py-1.5 hover:bg-slate-50 text-slate-700 font-medium"
                    >
                      {yr}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Stat & Time Filter Group */}
          <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
            <div className="flex items-baseline gap-2">
              <span className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight font-sans">
                {formatValue(analytics.totalSalesCents)}
              </span>
              {analytics.hasRealSales ? (
                <span className="text-xs font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full inline-flex items-center gap-0.5">
                  <TrendingUp className="w-3 h-3" />
                  <span>Real Revenue</span>
                </span>
              ) : (
                <span className="text-xs font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">
                  Zero Sales
                </span>
              )}
            </div>

            {/* Pill Filters: 12 Months | 30 days | 7 days | 24 hours */}
            <div className="flex items-center gap-1 bg-slate-50/80 p-1 rounded-lg border border-slate-100">
              {(['12 Months', '30 days', '7 days', '24 hours'] as const).map((filter) => {
                const isActive = timeFilter === filter;
                return (
                  <button
                    key={filter}
                    type="button"
                    onClick={() => setTimeFilter(filter)}
                    className={`px-3 py-1 rounded-md text-xs font-semibold transition-all ${
                      isActive
                        ? 'bg-[#8b5cf6] text-white shadow-xs'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
                    }`}
                  >
                    {filter}
                  </button>
                );
              })}
            </div>
          </div>

          {/* DUAL BAR CHART (Gradient Purple/Blue + Coral/Pink) */}
          <div className="relative pt-6 pb-2 min-h-[220px]">
            {/* Horizontal Gridlines */}
            <div className="absolute inset-x-0 inset-y-6 flex flex-col justify-between pointer-events-none text-[10px] text-slate-300 font-mono">
              <div className="border-b border-dashed border-slate-100 w-full flex justify-between">
                <span>{maxMonthlyIncome > 0 ? formatValue(maxMonthlyIncome) : 'R 0'}</span>
              </div>
              <div className="border-b border-dashed border-slate-100 w-full flex justify-between">
                <span>{maxMonthlyIncome > 0 ? formatValue(Math.round(maxMonthlyIncome * 0.66)) : 'R 0'}</span>
              </div>
              <div className="border-b border-dashed border-slate-100 w-full flex justify-between">
                <span>{maxMonthlyIncome > 0 ? formatValue(Math.round(maxMonthlyIncome * 0.33)) : 'R 0'}</span>
              </div>
              <div className="border-b border-slate-100 w-full flex justify-between">
                <span>R 0</span>
              </div>
            </div>

            {/* If zero sales, show empty state notice overlay */}
            {!analytics.hasRealSales && (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-white/70 backdrop-blur-2xs z-10 text-center p-4">
                <AlertCircle className="w-8 h-8 text-slate-400 mb-1" />
                <p className="text-xs font-bold text-slate-700">No Sales Recorded for Selected Timeframe</p>
                <p className="text-[11px] text-slate-400 max-w-xs mt-0.5">
                  All chart dual-bars reset strictly to zero. Place an order or click "Restore Store Orders" to view live metrics.
                </p>
              </div>
            )}

            {/* Bars Container */}
            <div className="relative flex items-end justify-between gap-1 sm:gap-2 h-44 px-2 pt-6">
              {analytics.monthlyBreakdown.map((bar) => {
                const incomePercent = maxMonthlyIncome > 0 ? Math.min(100, Math.round((bar.incomeCents / maxMonthlyIncome) * 100)) : 0;
                const expensePercent = maxMonthlyIncome > 0 ? Math.min(100, Math.round((bar.expenseCents / maxMonthlyIncome) * 100)) : 0;

                return (
                  <div
                    key={bar.month}
                    className="flex-1 flex flex-col items-center h-full justify-end group cursor-pointer"
                    onMouseEnter={() => setHoveredBar(bar)}
                    onMouseLeave={() => setHoveredBar(null)}
                  >
                    {/* The Dual Bars Side-by-Side */}
                    <div className="w-full flex items-end justify-center gap-0.5 sm:gap-1 h-36">
                      {/* Bar 1: Income (Electric Blue -> Purple gradient) */}
                      <div
                        style={{ height: `${incomePercent}%` }}
                        className="w-1.5 sm:w-2.5 rounded-t-sm transition-all duration-300 bg-gradient-to-t from-[#3b82f6] to-[#8b5cf6] group-hover:brightness-110"
                      />

                      {/* Bar 2: Expense / Fulfilment (Coral / Rose / Sunset gradient) */}
                      <div
                        style={{ height: `${expensePercent}%` }}
                        className="w-1.5 sm:w-2.5 rounded-t-sm transition-all duration-300 bg-gradient-to-t from-[#f43f5e] via-[#fb7185] to-[#f97316] group-hover:brightness-110"
                      />
                    </div>

                    {/* Month Label */}
                    <span className="text-[11px] font-medium text-slate-400 mt-2 group-hover:text-slate-900 transition-colors">
                      {bar.month}
                    </span>
                  </div>
                );
              })}
            </div>

            {/* Hover Tooltip */}
            {hoveredBar && (
              <div className="absolute top-2 left-1/2 -translate-x-1/2 bg-slate-900 text-white px-3 py-1.5 rounded-lg text-xs shadow-xl flex items-center gap-3 z-30 pointer-events-none">
                <span className="font-bold">{hoveredBar.month}</span>
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-[#8b5cf6]" />
                  <span>Income: {formatValue(hoveredBar.incomeCents)}</span>
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-[#f43f5e]" />
                  <span>Cost: {formatValue(hoveredBar.expenseCents)}</span>
                </span>
              </div>
            )}
          </div>

          {/* Chart Legend Bottom */}
          <div className="flex items-center gap-6 mt-4 pt-3 border-t border-slate-50 text-xs">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-gradient-to-tr from-[#3b82f6] to-[#8b5cf6]" />
              <span className="font-medium text-slate-600">Income (Store Sales)</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-gradient-to-tr from-[#f43f5e] to-[#f97316]" />
              <span className="font-medium text-slate-600">Expense (Fulfilment Cost)</span>
            </div>
          </div>
        </div>

        {/* ---- RIGHT 4 COLS: TWO METRIC CARDS (Total Sales & Sales Return) ---- */}
        <div className="lg:col-span-4 flex flex-col sm:flex-row lg:flex-col gap-6">
          {/* Card 1: Total Sales */}
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 flex flex-col justify-between flex-1 hover:shadow-md transition-shadow">
            <div className="flex items-start justify-between">
              {/* Circular Cyan/Teal Gradient Button */}
              <div className="w-13 h-13 rounded-full bg-gradient-to-tr from-[#06b6d4] to-[#0ea5e9] flex items-center justify-center text-white shadow-lg shadow-cyan-500/25">
                <Tag className="w-6 h-6 stroke-[2.2]" />
              </div>

              <button
                type="button"
                onClick={() => onNavigateTab('orders')}
                className="text-slate-300 hover:text-slate-600 p-1 transition-colors cursor-pointer"
                title="View Sales Details"
              >
                <ArrowUpRight className="w-4 h-4" />
              </button>
            </div>

            <div className="mt-6">
              <p className="text-xs font-medium text-slate-500 tracking-wide uppercase">Total Sales</p>
              <p className="text-3xl font-extrabold text-slate-900 tracking-tight font-sans mt-1">
                {formatValue(analytics.totalSalesCents)}
              </p>
              <div className="mt-2 flex items-center gap-1.5 text-[11px] text-slate-400">
                <span className="text-emerald-600 font-semibold">{analytics.totalOrdersCount} paid orders</span>
                <span>in store record</span>
              </div>
            </div>
          </div>

          {/* Card 2: Sales Return */}
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 flex flex-col justify-between flex-1 hover:shadow-md transition-shadow">
            <div className="flex items-start justify-between">
              {/* Circular Soft Blue / Indigo Gradient Button */}
              <div className="w-13 h-13 rounded-full bg-gradient-to-tr from-[#3b82f6] to-[#6366f1] flex items-center justify-center text-white shadow-lg shadow-blue-500/25">
                <CalendarCheck className="w-6 h-6 stroke-[2.2]" />
              </div>

              <button
                type="button"
                onClick={() => onNavigateTab('returns')}
                className="text-slate-300 hover:text-slate-600 p-1 transition-colors cursor-pointer"
                title="View Returns"
              >
                <ArrowUpRight className="w-4 h-4" />
              </button>
            </div>

            <div className="mt-6">
              <p className="text-xs font-medium text-slate-500 tracking-wide uppercase">Sales Return</p>
              <p className="text-3xl font-extrabold text-slate-900 tracking-tight font-sans mt-1">
                {analytics.returnsCount}
              </p>
              <div className="mt-2 flex items-center gap-1.5 text-[11px] text-slate-400">
                <span className="text-slate-500 font-medium">
                  {analytics.returnsCount === 0 ? '0 refunds' : formatValue(analytics.returnsCents)}
                </span>
                <span>return value</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ============================================================== */}
      {/* ROW 2: Top Selling Products (Left 8) + Sales by Location (Right 4) */}
      {/* ============================================================== */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* ---- LEFT 8 COLS: TOP SELLING PRODUCTS TABLE ---- */}
        <div className="lg:col-span-8 bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
          {/* Table Header: Title & Dropdown */}
          <div className="flex items-center justify-between mb-5">
            <div>
              <h2 className="text-base font-bold text-slate-800 tracking-tight">Top Selling Products</h2>
              <p className="text-xs text-slate-400">Authoritative store catalog items ranked by actual sales</p>
            </div>

            <div className="relative">
              <button
                type="button"
                onClick={() => setIsProductDateDropdownOpen(!isProductDateDropdownOpen)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-xs font-medium text-slate-600 hover:border-slate-300 hover:text-slate-900 transition-colors shadow-2xs"
              >
                <span>{topProductDate}</span>
                <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
              </button>

              {isProductDateDropdownOpen && (
                <div className="absolute right-0 mt-1 w-44 bg-white border border-slate-100 rounded-xl shadow-xl z-20 py-1 text-xs">
                  {['All Time Store Sales', 'This Month', 'This Week'].map((dt) => (
                    <button
                      key={dt}
                      onClick={() => {
                        setTopProductDate(dt);
                        setIsProductDateDropdownOpen(false);
                      }}
                      className="w-full text-left px-3 py-1.5 hover:bg-slate-50 text-slate-700 font-medium"
                    >
                      {dt}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Table Container */}
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-slate-100 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                  <th className="pb-3 pl-2">Product Name</th>
                  <th className="pb-3 text-center">Total Sold</th>
                  <th className="pb-3 text-right">Total Revenue</th>
                  <th className="pb-3 text-right pr-2">Store / Depot</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50 text-xs">
                {analytics.topProducts.slice(0, 5).map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50/70 transition-colors">
                    {/* Product Name & Avatar */}
                    <td className="py-3.5 pl-2">
                      <div className="flex items-center gap-3">
                        <img
                          src={item.image}
                          alt={item.name}
                          className="w-10 h-10 rounded-xl object-cover border border-slate-100 shadow-2xs bg-slate-50 shrink-0"
                          onError={(e) => {
                            (e.target as any).src = 'https://images.unsplash.com/photo-1592945403244-b3fbafd7f539?w=150&auto=format&fit=crop&q=80';
                          }}
                        />
                        <div className="min-w-0">
                          <p className="font-bold text-slate-800 truncate max-w-xs">{item.name}</p>
                          <p className="text-[11px] text-slate-400 truncate max-w-xs">{item.category}</p>
                        </div>
                      </div>
                    </td>

                    {/* Total Sold */}
                    <td className="py-3.5 text-center font-bold text-slate-700">
                      {item.unitsSold}
                    </td>

                    {/* Total Revenue */}
                    <td className="py-3.5 text-right font-extrabold text-slate-900 font-sans">
                      {formatValue(item.revenueCents)}
                    </td>

                    {/* Store / Depot */}
                    <td className="py-3.5 text-right pr-2 text-slate-500 font-medium">
                      {item.locationName}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* ---- RIGHT 4 COLS: SALES & PURCHASE OF STORE LOCATION ---- */}
        <div className="lg:col-span-4 bg-white rounded-2xl border border-slate-100 shadow-sm p-6 flex flex-col justify-between">
          <div>
            <h2 className="text-base font-bold text-slate-800 tracking-tight">Sales by Store Location</h2>
            <p className="text-xs text-slate-400 mt-0.5">Nationwide order distribution</p>
          </div>

          {/* Donut Chart Gauge */}
          <div className="py-6 flex items-center justify-center">
            <div className="relative w-40 h-40">
              <svg className="w-full h-full -rotate-90" viewBox="0 0 160 160">
                <defs>
                  <linearGradient id="purpleRingGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#7c3aed" />
                    <stop offset="50%" stopColor="#a855f7" />
                    <stop offset="100%" stopColor="#c084fc" />
                  </linearGradient>
                </defs>

                {/* Background Lavender Track */}
                <circle
                  cx="80"
                  cy="80"
                  r="62"
                  stroke="#ede9fe"
                  strokeWidth="14"
                  fill="none"
                />

                {/* Active Purple/Violet Gradient Progress Stroke */}
                <circle
                  cx="80"
                  cy="80"
                  r="62"
                  stroke="url(#purpleRingGradient)"
                  strokeWidth="14"
                  fill="none"
                  strokeDasharray="390"
                  strokeDashoffset={analytics.hasRealSales ? '95' : '390'}
                  strokeLinecap="round"
                  className="transition-all duration-1000 ease-out"
                />
              </svg>

              {/* Centered Donut Text */}
              <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                <span className="text-xs font-medium text-slate-400">Total Sales</span>
                <span className="text-xl font-black text-slate-900 tracking-tight font-sans mt-0.5">
                  {formatValue(analytics.totalSalesCents)}
                </span>
                <span className="text-[10px] font-bold text-purple-600 bg-purple-50 px-2 py-0.5 rounded-full mt-1.5">
                  {analytics.hasRealSales ? 'Active Orders' : 'Zero Sales'}
                </span>
              </div>
            </div>
          </div>

          {/* Location Breakdown Badges */}
          <div className="space-y-2 pt-2 border-t border-slate-50 text-xs">
            {analytics.salesByLocation.length > 0 ? (
              analytics.salesByLocation.slice(0, 3).map((loc, idx) => {
                const colors = ['bg-[#8b5cf6]', 'bg-[#a855f7]', 'bg-[#c084fc]'];
                return (
                  <div key={loc.location} className="flex items-center justify-between text-slate-600">
                    <div className="flex items-center gap-2">
                      <span className={`w-2.5 h-2.5 rounded-full ${colors[idx % colors.length]}`} />
                      <span className="font-medium">{loc.location}</span>
                    </div>
                    <span className="font-bold text-slate-900">{loc.percentage}%</span>
                  </div>
                );
              })
            ) : (
              <div className="text-center py-2 text-slate-400 text-xs">
                No location delivery data yet
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
