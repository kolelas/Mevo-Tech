import React, { useEffect, useState } from 'react';
import { api } from '../services/api';
import { Order, OrderStatus, Product, StockMovement, AuditLogEntry, StoreSettings, PromotionalBanner } from '../types';
import { formatZAR } from '../utils/calculations';
import { useAuth } from '../context/AuthContext';
import {
  LayoutDashboard,
  Package,
  ShoppingBag,
  Boxes,
  ScrollText,
  Settings,
  CreditCard,
  RefreshCw,
  Plus,
  Truck,
  CheckCircle2,
  AlertTriangle,
  Sparkles,
  Tag,
} from 'lucide-react';

export const AdminDashboard: React.FC = () => {
  const { currentUser, adminUser } = useAuth();
  const activeAdmin = adminUser || currentUser;
  const [activeTab, setActiveTab] = useState<'overview' | 'orders' | 'inventory' | 'gateways' | 'audit' | 'promotions'>('overview');

  const [metrics, setMetrics] = useState<any>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [movements, setMovements] = useState<StockMovement[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>([]);
  const [settings, setSettings] = useState<StoreSettings | null>(null);
  const [banners, setBanners] = useState<PromotionalBanner[]>([]);

  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [orderStatusFilter, setOrderStatusFilter] = useState<string>('all');

  // Stock Adjustment Form State
  const [adjustProductId, setAdjustProductId] = useState<string>('');
  const [adjustQty, setAdjustQty] = useState<number>(5);
  const [adjustReason, setAdjustReason] = useState<string>('Supplier batch delivery intake');
  const [adjustSuccess, setAdjustSuccess] = useState<string | null>(null);

  // New Product Modal State
  const [isAddProductOpen, setIsAddProductOpen] = useState(false);
  const [newProductName, setNewProductName] = useState('');
  const [newProductSku, setNewProductSku] = useState('');
  const [newProductCategory, setNewProductCategory] = useState('Laptops & Notebooks');
  const [newProductPriceZAR, setNewProductPriceZAR] = useState('18999');
  const [newProductStock, setNewProductStock] = useState('10');
  const [newProductTagline, setNewProductTagline] = useState('');

  // Waybill dispatch form state
  const [trackingOrderRef, setTrackingOrderRef] = useState<string | null>(null);
  const [courierName, setCourierName] = useState('The Courier Guy');
  const [waybillNumber, setWaybillNumber] = useState('');

  const loadData = async () => {
    setIsLoading(true);
    setLoadError(null);
    try {
      const [m, ords, prods, movs, logs, s, b] = await Promise.all([
        api.getAdminMetrics(),
        api.getAdminOrders(),
        api.getProducts(),
        api.getStockMovements(),
        api.getAuditLogs(),
        api.getStoreInfo(),
        api.getAdminPromotions(),
      ]);
      setMetrics(m);
      setOrders(ords);
      setProducts(prods);
      setMovements(movs);
      setAuditLogs(logs);
      setSettings(s.settings);
      setBanners(b || []);
    } catch (e: any) {
      console.error('Failed to load admin data', e);
      setLoadError(e.message || 'Failed to authenticate or load administrative records.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleStockAdjustment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adjustProductId) return;

    try {
      await api.adjustInventory({
        productId: adjustProductId,
        quantityChange: Number(adjustQty),
        reason: adjustReason,
        performedBy: activeAdmin.name,
      });
      setAdjustSuccess(`Successfully adjusted inventory (${adjustQty > 0 ? '+' : ''}${adjustQty})`);
      setTimeout(() => setAdjustSuccess(null), 3000);
      loadData();
    } catch (err: any) {
      alert(err.message || 'Stock adjustment failed');
    }
  };

  const handleCreateProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProductName.trim() || !newProductSku.trim()) return;

    try {
      const priceCents = Math.round(Number(newProductPriceZAR) * 100);
      const stock = Math.max(0, parseInt(newProductStock, 10) || 0);
      const slug = newProductName
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '');

      await api.createProduct(
        {
          name: newProductName.trim(),
          slug,
          sku: newProductSku.trim().toUpperCase(),
          brand: 'Mevo Precision',
          category: newProductCategory,
          tagline: newProductTagline.trim() || `${newProductName} - Verified Local Stock`,
          description: `Premium high-performance ${newProductName}. Backed by official Mevo Tech Johannesburg 2-year warranty and free national door courier.`,
          priceCents,
          costPriceCents: Math.round(priceCents * 0.7),
          primaryImage: '/src/assets/images/hero_tech_showcase_1793053698167.jpg',
          images: ['/src/assets/images/hero_tech_showcase_1793053698167.jpg'],
          specifications: [
            { group: 'Hardware', name: 'Standard', value: 'High Performance Specification' },
            { group: 'Warranty', name: 'Coverage', value: '2-Year Local On-site Warranty' },
          ],
          variants: [],
          onHandQuantity: stock,
          reservedQuantity: 0,
          lowStockThreshold: 3,
          isActive: true,
          isNewArrival: true,
          warrantyPeriodMonths: 24,
        },
        activeAdmin.name
      );

      setIsAddProductOpen(false);
      setNewProductName('');
      setNewProductSku('');
      setNewProductTagline('');
      loadData();
    } catch (err: any) {
      alert(err.message || 'Failed to create product');
    }
  };

  const handleStatusChange = async (reference: string, nextStatus: OrderStatus) => {
    try {
      await api.updateOrderStatus(
        reference,
        nextStatus,
        `Status changed to ${nextStatus} by ${activeAdmin.name}`,
        activeAdmin.name
      );
      loadData();
    } catch (err: any) {
      alert(err.message || 'Status transition failed');
    }
  };

  const handleDispatchOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!trackingOrderRef || !waybillNumber.trim()) return;

    try {
      await api.updateOrderTracking(
        trackingOrderRef,
        courierName,
        waybillNumber.trim(),
        undefined,
        activeAdmin.name
      );
      setTrackingOrderRef(null);
      setWaybillNumber('');
      loadData();
    } catch (err: any) {
      alert(err.message || 'Dispatch failed');
    }
  };

  const handleToggleBanner = async (id: string, currentActive: boolean) => {
    try {
      await api.updatePromotion(id, { isActive: !currentActive }, activeAdmin.name);
      loadData();
    } catch (err: any) {
      alert(err.message || 'Failed to update promotion');
    }
  };

  const filteredOrders = orders.filter((o) => {
    if (orderStatusFilter !== 'all' && o.status !== orderStatusFilter) return false;
    if (searchTerm) {
      const q = searchTerm.toLowerCase();
      return (
        o.reference.toLowerCase().includes(q) ||
        o.customerEmail.toLowerCase().includes(q) ||
        o.customerName.toLowerCase().includes(q)
      );
    }
    return true;
  });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 animate-in fade-in">
      {/* Admin Error Alert Banner */}
      {loadError && (
        <div className="mb-6 p-4 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-900 flex items-start justify-between gap-3">
          <div className="flex items-start gap-2.5">
            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold">Security Session Issue</p>
              <p className="mt-0.5 text-amber-800">{loadError}</p>
            </div>
          </div>
          <button
            onClick={loadData}
            className="px-3 py-1 bg-amber-600 hover:bg-amber-700 text-white rounded-lg font-bold text-xs shrink-0"
          >
            Retry Connection
          </button>
        </div>
      )}

      {/* Admin Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-neutral-200">
        <div className="flex items-center gap-3.5">
          <div className="rounded-xl bg-neutral-950 p-1 border border-neutral-800 shadow-sm shrink-0">
            <img
              src="/assets/aistudio/Generated_Image_October_29__2026_-_8_40PM_f8f1a10b.png"
              alt="MEVO TECH"
              className="w-16 h-11 object-cover rounded-lg"
            />
          </div>
          <div className="flex flex-col">
            <div className="flex items-center gap-3">
              <img
                src="/assets/aistudio/mevo_wordmark_light.png"
                alt="MEVO TECH"
                className="h-7 w-auto object-contain"
              />
              <span className="text-[10px] font-bold bg-purple-100 text-purple-800 px-2 py-0.5 rounded uppercase tracking-wider font-sans">
                Admin Console · Sandton HQ
              </span>
            </div>
            <p className="font-['Rajdhani',sans-serif] text-xs font-semibold text-neutral-500 mt-1 tracking-wider">
              Authorized Operator: <strong className="text-neutral-800 font-sans">{activeAdmin.name}</strong> ({activeAdmin.role})
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={loadData}
            disabled={isLoading}
            className="px-3 py-2 bg-white border border-neutral-300 rounded-lg text-xs font-semibold text-neutral-700 hover:bg-neutral-50 transition-colors flex items-center gap-1.5 shadow-sm"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            <span>Sync Data</span>
          </button>
        </div>
      </div>

      {/* Admin Navigation Tabs */}
      <div className="flex overflow-x-auto gap-2 py-4 border-b border-neutral-200 mb-6 text-xs">
        {[
          { id: 'overview', label: 'Overview & KPIs', icon: LayoutDashboard },
          { id: 'orders', label: `Orders (${orders.length})`, icon: ShoppingBag },
          { id: 'inventory', label: `Inventory & Stock (${products.length})`, icon: Boxes },
          { id: 'promotions', label: `Promotions & Banners (${banners.length})`, icon: Sparkles },
          { id: 'gateways', label: 'Payment Gateways', icon: CreditCard },
          { id: 'audit', label: `Audit Log (${auditLogs.length})`, icon: ScrollText },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-lg font-semibold transition-colors shrink-0 ${
                isActive
                  ? 'bg-neutral-900 text-white shadow-sm'
                  : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200/70 hover:text-neutral-900'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* TAB 1: OVERVIEW */}
      {activeTab === 'overview' && metrics && (
        <div className="space-y-6">
          {/* Key Metric Tiles */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white p-5 rounded-xl border border-neutral-200 shadow-sm">
              <span className="text-xs font-bold text-neutral-500 uppercase tracking-wider">Confirmed Sales (ZAR)</span>
              <p className="text-2xl font-extrabold text-neutral-900 font-mono tabular-nums mt-1">
                {formatZAR(metrics.totalSalesCents)}
              </p>
              <span className="text-[11px] text-emerald-700 font-medium">100% Verified Paid Settlements</span>
            </div>

            <div className="bg-white p-5 rounded-xl border border-neutral-200 shadow-sm">
              <span className="text-xs font-bold text-neutral-500 uppercase tracking-wider">Fulfilled / Paid Orders</span>
              <p className="text-2xl font-extrabold text-neutral-900 font-mono tabular-nums mt-1">
                {metrics.paidOrdersCount}
              </p>
              <span className="text-[11px] text-neutral-400">Total customer checkout completions</span>
            </div>

            <div className="bg-white p-5 rounded-xl border border-neutral-200 shadow-sm">
              <span className="text-xs font-bold text-neutral-500 uppercase tracking-wider">Average Order Value</span>
              <p className="text-2xl font-extrabold text-neutral-900 font-mono tabular-nums mt-1">
                {formatZAR(metrics.averageOrderValueCents)}
              </p>
              <span className="text-[11px] text-neutral-400">Calculated over confirmed orders</span>
            </div>

            <div className="bg-white p-5 rounded-xl border border-neutral-200 shadow-sm">
              <span className="text-xs font-bold text-neutral-500 uppercase tracking-wider">Low Stock SKUs</span>
              <p className="text-2xl font-extrabold text-amber-600 font-mono tabular-nums mt-1">
                {metrics.lowStockCount}
              </p>
              <span className="text-[11px] text-neutral-400">Products near or under threshold</span>
            </div>
          </div>

          {/* Recent Orders Preview */}
          <div className="bg-white rounded-xl border border-neutral-200 shadow-sm p-6">
            <h3 className="text-sm font-bold text-neutral-900 uppercase tracking-wider mb-4">Recent Order Activity</h3>
            {orders.length === 0 ? (
              <p className="text-xs text-neutral-500 py-6 text-center">No orders recorded yet. Make a purchase through storefront!</p>
            ) : (
              <div className="divide-y divide-neutral-100 text-xs">
                {orders.slice(0, 5).map((o) => (
                  <div key={o.reference} className="py-3 flex items-center justify-between">
                    <div>
                      <span className="font-mono font-bold text-purple-600 mr-2">{o.reference}</span>
                      <span className="text-neutral-800 font-semibold">{o.customerName}</span>
                      <span className="text-neutral-400 ml-2">({o.customerEmail})</span>
                      <div className="text-[11px] text-neutral-400 mt-0.5">
                        {o.items.length} items · {o.shippingAddress.suburb}, {o.shippingAddress.province}
                      </div>
                    </div>

                    <div className="text-right">
                      <span className="font-mono font-bold text-neutral-900">{formatZAR(o.totalCents)}</span>
                      <div className="mt-0.5">
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                            o.status === 'PAID'
                              ? 'bg-emerald-100 text-emerald-800'
                              : o.status === 'SHIPPED'
                              ? 'bg-purple-100 text-purple-800'
                              : 'bg-amber-100 text-amber-800'
                          }`}
                        >
                          {o.status}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 2: ORDERS MANAGEMENT */}
      {activeTab === 'orders' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-3 justify-between items-center bg-white p-4 rounded-xl border border-neutral-200 text-xs">
            <input
              type="text"
              placeholder="Filter by Order Reference, Customer, or Email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full sm:w-72 px-3 py-2 border border-neutral-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-purple-600"
            />

            <div className="flex items-center gap-2">
              <span className="text-neutral-500 font-medium">Status:</span>
              <select
                value={orderStatusFilter}
                onChange={(e) => setOrderStatusFilter(e.target.value)}
                className="px-3 py-2 border border-neutral-300 rounded-lg bg-white focus:outline-none"
              >
                <option value="all">All Statuses</option>
                <option value="PENDING_PAYMENT">Pending Payment</option>
                <option value="PAID">Paid</option>
                <option value="PROCESSING">Processing</option>
                <option value="SHIPPED">Shipped</option>
                <option value="DELIVERED">Delivered</option>
                <option value="CANCELLED">Cancelled</option>
              </select>
            </div>
          </div>

          {/* Orders Table */}
          <div className="bg-white rounded-xl border border-neutral-200 overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-neutral-50 border-b border-neutral-200 text-neutral-500 font-bold uppercase tracking-wider">
                  <tr>
                    <th className="p-3.5">Reference</th>
                    <th className="p-3.5">Customer & Delivery</th>
                    <th className="p-3.5">Amount (ZAR)</th>
                    <th className="p-3.5">Gateway</th>
                    <th className="p-3.5">Status</th>
                    <th className="p-3.5">Tracking</th>
                    <th className="p-3.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100 text-neutral-800">
                  {filteredOrders.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="p-8 text-center text-neutral-400">
                        No orders matching the current filter.
                      </td>
                    </tr>
                  ) : (
                    filteredOrders.map((ord) => (
                      <tr key={ord.reference} className="hover:bg-neutral-50/80 transition-colors">
                        <td className="p-3.5 font-mono font-bold text-neutral-900">{ord.reference}</td>
                        <td className="p-3.5">
                          <p className="font-semibold text-neutral-900">{ord.customerName}</p>
                          <p className="text-[11px] text-neutral-500">{ord.shippingAddress.suburb}, {ord.shippingAddress.province}</p>
                        </td>
                        <td className="p-3.5 font-mono font-bold tabular-nums">{formatZAR(ord.totalCents)}</td>
                        <td className="p-3.5 capitalize font-medium">{ord.paymentMethod}</td>
                        <td className="p-3.5">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              ord.status === 'PAID'
                                ? 'bg-emerald-100 text-emerald-800'
                                : ord.status === 'SHIPPED'
                                ? 'bg-purple-100 text-purple-800'
                                : ord.status === 'DELIVERED'
                                ? 'bg-purple-100 text-purple-800'
                                : 'bg-neutral-100 text-neutral-800'
                            }`}
                          >
                            {ord.status}
                          </span>
                        </td>
                        <td className="p-3.5 font-mono text-[11px]">
                          {ord.trackingNumber ? (
                            <span className="text-purple-600 font-semibold">{ord.trackingNumber}</span>
                          ) : (
                            <span className="text-neutral-400">Unassigned</span>
                          )}
                        </td>
                        <td className="p-3.5 text-right space-x-1">
                          {ord.status === 'PAID' && (
                            <button
                              onClick={() => handleStatusChange(ord.reference, 'PROCESSING')}
                              className="px-2 py-1 bg-neutral-100 hover:bg-neutral-200 text-neutral-800 rounded font-semibold text-[11px]"
                            >
                              Process
                            </button>
                          )}
                          {(ord.status === 'PAID' || ord.status === 'PROCESSING') && (
                            <button
                              onClick={() => setTrackingOrderRef(ord.reference)}
                              className="px-2 py-1 bg-purple-50 hover:bg-purple-100 text-purple-700 rounded font-semibold text-[11px]"
                            >
                              Dispatch
                            </button>
                          )}
                          {ord.status === 'SHIPPED' && (
                            <button
                              onClick={() => handleStatusChange(ord.reference, 'DELIVERED')}
                              className="px-2 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 rounded font-semibold text-[11px]"
                            >
                              Mark Delivered
                            </button>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Dispatch Waybill Modal */}
          {trackingOrderRef && (
            <div className="fixed inset-0 z-50 bg-neutral-900/60 backdrop-blur-sm flex items-center justify-center p-4">
              <div className="bg-white rounded-xl max-w-md w-full p-6 shadow-xl border border-neutral-200 text-xs">
                <h3 className="text-sm font-bold text-neutral-900 mb-3">
                  Assign Courier Waybill for {trackingOrderRef}
                </h3>
                <form onSubmit={handleDispatchOrder} className="space-y-3">
                  <div>
                    <label className="block text-neutral-600 font-medium mb-1">Courier Partner</label>
                    <select
                      value={courierName}
                      onChange={(e) => setCourierName(e.target.value)}
                      className="w-full px-3 py-2 border border-neutral-300 rounded-lg bg-white"
                    >
                      <option value="The Courier Guy">The Courier Guy (Pty) Ltd</option>
                      <option value="DPD Laser Express">DPD Laser Express</option>
                      <option value="RAM Hand-to-Hand">RAM Hand-to-Hand Couriers</option>
                      <option value="Fastway Couriers">Fastway South Africa</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-neutral-600 font-medium mb-1">Waybill / Tracking Number</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. TCG-9482012"
                      value={waybillNumber}
                      onChange={(e) => setWaybillNumber(e.target.value)}
                      className="w-full px-3 py-2 border border-neutral-300 rounded-lg font-mono"
                    />
                  </div>

                  <div className="pt-2 flex justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => setTrackingOrderRef(null)}
                      className="px-3 py-2 bg-neutral-100 text-neutral-700 rounded-lg font-semibold"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-2 bg-purple-600 text-white rounded-lg font-semibold hover:bg-purple-700"
                    >
                      Confirm Dispatch & Mark Shipped
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 3: INVENTORY MANAGEMENT */}
      {activeTab === 'inventory' && (
        <div className="space-y-6">
          {/* Stock Adjustment Action Panel */}
          <div className="bg-white rounded-xl border border-neutral-200 p-6 shadow-sm">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-2">
              <h3 className="text-sm font-bold text-neutral-900 uppercase tracking-wider">
                Warehouse Stock Adjustment (Johannesburg Depot)
              </h3>
              <button
                type="button"
                onClick={() => setIsAddProductOpen(true)}
                className="px-3 py-1.5 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-bold text-xs flex items-center gap-1.5 self-start sm:self-auto shadow-xs"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Create New Product SKU</span>
              </button>
            </div>
            <p className="text-xs text-neutral-500 mb-4">
              All inventory adjustments create an immutable stock movement record and audit log.
            </p>

            {adjustSuccess && (
              <div className="mb-4 p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 font-medium">
                {adjustSuccess}
              </div>
            )}

            <form onSubmit={handleStockAdjustment} className="grid grid-cols-1 sm:grid-cols-4 gap-3 text-xs">
              <div>
                <label className="block text-neutral-600 font-medium mb-1">Select Product SKU</label>
                <select
                  required
                  value={adjustProductId}
                  onChange={(e) => setAdjustProductId(e.target.value)}
                  className="w-full px-3 py-2 border border-neutral-300 rounded-lg bg-white"
                >
                  <option value="">Choose product...</option>
                  {products.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.sku} — {p.name} (On Hand: {p.onHandQuantity})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-neutral-600 font-medium mb-1">Quantity Delta (+ or -)</label>
                <input
                  type="number"
                  required
                  value={adjustQty}
                  onChange={(e) => setAdjustQty(Number(e.target.value))}
                  className="w-full px-3 py-2 border border-neutral-300 rounded-lg font-mono"
                />
              </div>

              <div>
                <label className="block text-neutral-600 font-medium mb-1">Audit Reason</label>
                <input
                  type="text"
                  required
                  value={adjustReason}
                  onChange={(e) => setAdjustReason(e.target.value)}
                  placeholder="e.g. Supplier delivery or damage return"
                  className="w-full px-3 py-2 border border-neutral-300 rounded-lg"
                />
              </div>

              <div className="flex items-end">
                <button
                  type="submit"
                  disabled={!adjustProductId}
                  className="w-full py-2.5 px-4 bg-neutral-900 text-white rounded-lg font-bold hover:bg-purple-600 transition-colors disabled:opacity-40"
                >
                  Submit Stock Adjustment
                </button>
              </div>
            </form>
          </div>

          {/* Current Inventory Balances Table */}
          <div className="bg-white rounded-xl border border-neutral-200 overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-neutral-50 border-b border-neutral-200 text-neutral-500 font-bold uppercase tracking-wider">
                  <tr>
                    <th className="p-3.5">SKU & Product</th>
                    <th className="p-3.5">Category</th>
                    <th className="p-3.5">Selling Price</th>
                    <th className="p-3.5">On Hand</th>
                    <th className="p-3.5">Reserved</th>
                    <th className="p-3.5">Available to Sell</th>
                    <th className="p-3.5">Threshold</th>
                    <th className="p-3.5">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100 text-neutral-800">
                  {products.map((p) => {
                    const available = p.onHandQuantity - p.reservedQuantity;
                    const isLow = available <= p.lowStockThreshold;
                    return (
                      <tr key={p.id} className="hover:bg-neutral-50/80">
                        <td className="p-3.5">
                          <p className="font-mono font-bold text-neutral-900">{p.sku}</p>
                          <p className="text-neutral-600 truncate max-w-xs">{p.name}</p>
                        </td>
                        <td className="p-3.5">{p.category}</td>
                        <td className="p-3.5 font-mono tabular-nums">{formatZAR(p.promotionalPriceCents || p.priceCents)}</td>
                        <td className="p-3.5 font-mono font-bold text-neutral-900">{p.onHandQuantity}</td>
                        <td className="p-3.5 font-mono text-amber-600">{p.reservedQuantity}</td>
                        <td className="p-3.5 font-mono font-bold text-emerald-700">{available}</td>
                        <td className="p-3.5 font-mono text-neutral-500">{p.lowStockThreshold}</td>
                        <td className="p-3.5">
                          {available <= 0 ? (
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-100 text-rose-800">
                              Out of Stock
                            </span>
                          ) : isLow ? (
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800">
                              Low Stock
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800">
                              Healthy
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Add Product Modal */}
          {isAddProductOpen && (
            <div className="fixed inset-0 z-50 bg-neutral-900/60 backdrop-blur-sm flex items-center justify-center p-4">
              <div className="bg-white rounded-xl max-w-lg w-full p-6 shadow-2xl border border-neutral-200 text-xs animate-in fade-in">
                <div className="flex items-center justify-between pb-3 border-b border-neutral-200 mb-4">
                  <div>
                    <h3 className="text-sm font-bold text-neutral-900">Add New Inventory Product SKU</h3>
                    <p className="text-[11px] text-neutral-500">Mevo Tech Johannesburg Depot Intake</p>
                  </div>
                  <button
                    onClick={() => setIsAddProductOpen(false)}
                    className="p-1 rounded-lg text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100"
                  >
                    ✕
                  </button>
                </div>

                <form onSubmit={handleCreateProduct} className="space-y-3">
                  <div>
                    <label className="block text-neutral-700 font-semibold mb-1">Product Name</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Mevo Titanium Ultra 15"
                      value={newProductName}
                      onChange={(e) => setNewProductName(e.target.value)}
                      className="w-full px-3 py-2 border border-neutral-300 rounded-lg text-xs"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-neutral-700 font-semibold mb-1">SKU Code</label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. MEV-NB-TITAN15"
                        value={newProductSku}
                        onChange={(e) => setNewProductSku(e.target.value)}
                        className="w-full px-3 py-2 border border-neutral-300 rounded-lg font-mono text-xs uppercase"
                      />
                    </div>
                    <div>
                      <label className="block text-neutral-700 font-semibold mb-1">Hardware Department</label>
                      <select
                        value={newProductCategory}
                        onChange={(e) => setNewProductCategory(e.target.value)}
                        className="w-full px-3 py-2 border border-neutral-300 rounded-lg bg-white text-xs"
                      >
                        <option value="Laptops & Notebooks">Laptops & Notebooks</option>
                        <option value="Monitors & Displays">Monitors & Displays</option>
                        <option value="Desktops & Workstations">Desktops & Workstations</option>
                        <option value="Audio & Peripherals">Audio & Peripherals</option>
                        <option value="Storage Devices">Storage Devices</option>
                        <option value="Networking & Smart Home">Networking & Smart Home</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-neutral-700 font-semibold mb-1">Selling Price (ZAR)</label>
                      <input
                        type="number"
                        required
                        placeholder="18999"
                        value={newProductPriceZAR}
                        onChange={(e) => setNewProductPriceZAR(e.target.value)}
                        className="w-full px-3 py-2 border border-neutral-300 rounded-lg font-mono text-xs"
                      />
                    </div>
                    <div>
                      <label className="block text-neutral-700 font-semibold mb-1">Initial Stock Intake (Units)</label>
                      <input
                        type="number"
                        required
                        min="1"
                        value={newProductStock}
                        onChange={(e) => setNewProductStock(e.target.value)}
                        className="w-full px-3 py-2 border border-neutral-300 rounded-lg font-mono text-xs"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-neutral-700 font-semibold mb-1">Technical Highlight Tagline</label>
                    <input
                      type="text"
                      placeholder="e.g. Intel Core Ultra 9 with 32GB RAM and 3K OLED"
                      value={newProductTagline}
                      onChange={(e) => setNewProductTagline(e.target.value)}
                      className="w-full px-3 py-2 border border-neutral-300 rounded-lg text-xs"
                    />
                  </div>

                  <div className="pt-3 flex justify-end gap-2 border-t border-neutral-100">
                    <button
                      type="button"
                      onClick={() => setIsAddProductOpen(false)}
                      className="px-3 py-2 bg-neutral-100 text-neutral-700 rounded-lg font-semibold hover:bg-neutral-200"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-2 bg-purple-600 text-white rounded-lg font-bold hover:bg-purple-700"
                    >
                      Save SKU to Inventory
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 4: PAYMENT GATEWAYS */}
      {activeTab === 'gateways' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            {/* PayFast */}
            <div className="bg-white p-5 rounded-xl border border-neutral-200 shadow-sm space-y-2">
              <div className="flex items-center justify-between">
                <h4 className="font-bold text-sm text-neutral-900">PayFast Gateway</h4>
                <span className="bg-emerald-100 text-emerald-800 text-[10px] font-bold px-2 py-0.5 rounded">Active (Sandbox/Live)</span>
              </div>
              <p className="text-neutral-500">Merchant ID: 10000100 (Official South African Sandbox)</p>
              <p className="text-neutral-500">Signature Algorithm: MD5 + Passphrase hashing</p>
              <p className="text-neutral-500">Supported: Visa, Mastercard, Instant EFT, Masterpass, Debit cards</p>
            </div>

            {/* Payflex */}
            <div className="bg-white p-5 rounded-xl border border-neutral-200 shadow-sm space-y-2">
              <div className="flex items-center justify-between">
                <h4 className="font-bold text-sm text-neutral-900">Payflex BNPL</h4>
                <span className="bg-emerald-100 text-emerald-800 text-[10px] font-bold px-2 py-0.5 rounded">Active (Sandbox)</span>
              </div>
              <p className="text-neutral-500">Instalments: 4x equal payments (First due on checkout)</p>
              <p className="text-neutral-500">Eligibility: R500.00 – R30,000.00 cart limits</p>
            </div>

            {/* Ozow */}
            <div className="bg-white p-5 rounded-xl border border-neutral-200 shadow-sm space-y-2">
              <div className="flex items-center justify-between">
                <h4 className="font-bold text-sm text-neutral-900">Ozow Instant EFT</h4>
                <span className="bg-emerald-100 text-emerald-800 text-[10px] font-bold px-2 py-0.5 rounded">Active (Sandbox)</span>
              </div>
              <p className="text-neutral-500">Site Code: MEV-001</p>
              <p className="text-neutral-500">Hash Check: SHA-512 callback verification</p>
              <p className="text-neutral-500">Banks: ABSA, Capitec, FNB, Nedbank, Standard Bank, Investec, TymeBank</p>
            </div>

            {/* Cryptocurrency */}
            <div className="bg-white p-5 rounded-xl border border-neutral-200 shadow-sm space-y-2">
              <div className="flex items-center justify-between">
                <h4 className="font-bold text-sm text-neutral-900">Cryptocurrency Engine</h4>
                <span className="bg-emerald-100 text-emerald-800 text-[10px] font-bold px-2 py-0.5 rounded">Active (Polygon / BTC)</span>
              </div>
              <p className="text-neutral-500">Asset Lock: 30-minute fixed rate guarantee</p>
              <p className="text-neutral-500">Supported: USDT (Polygon ERC-20), BTC (Bitcoin)</p>
            </div>
          </div>
        </div>
      )}

      {/* TAB 5: AUDIT LOG */}
      {activeTab === 'audit' && (
        <div className="bg-white rounded-xl border border-neutral-200 overflow-hidden shadow-sm">
          <div className="p-4 border-b border-neutral-200">
            <h3 className="text-sm font-bold text-neutral-900 uppercase tracking-wider">Immutable System Audit Trail</h3>
            <p className="text-xs text-neutral-500 mt-0.5">Captures all administrative, inventory, order, and payment events.</p>
          </div>

          <div className="divide-y divide-neutral-100 text-xs">
            {auditLogs.map((log) => (
              <div key={log.id} className="p-3.5 hover:bg-neutral-50/80 flex items-start justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-neutral-900 font-mono text-[11px] bg-neutral-100 px-1.5 py-0.5 rounded">
                      {log.action}
                    </span>
                    <span className="font-semibold text-neutral-800">{log.actor}</span>
                    <span className="text-neutral-400">({log.role})</span>
                  </div>
                  <p className="text-neutral-600 mt-1">{log.details}</p>
                </div>

                <div className="text-right shrink-0">
                  <span className="text-[11px] text-neutral-400 font-mono">
                    {new Date(log.timestamp).toLocaleTimeString('en-ZA', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 6: PROMOTIONS & SEASONAL BANNERS */}
      {activeTab === 'promotions' && (
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-xl border border-neutral-200 shadow-sm flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-neutral-900 uppercase tracking-wider">
                Storefront Seasonal Sales & Flash Deals
              </h3>
              <p className="text-xs text-neutral-500 mt-1">
                Active banners appear dynamically in the storefront hero section with real-time countdowns and CTA buttons.
              </p>
            </div>
            <span className="text-xs font-semibold px-2.5 py-1 bg-purple-50 text-purple-700 rounded-lg border border-purple-200">
              {banners.filter((b) => b.isActive).length} Active Banners
            </span>
          </div>

          <div className="grid grid-cols-1 gap-4">
            {banners.map((banner) => {
              const isExpired = banner.endsAt ? new Date(banner.endsAt).getTime() <= Date.now() : false;
              return (
                <div
                  key={banner.id}
                  className="bg-white p-5 rounded-xl border border-neutral-200 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4"
                >
                  <div className="space-y-1.5 max-w-xl">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-neutral-100 text-neutral-700 font-mono">
                        {banner.kicker}
                      </span>
                      {banner.discountCode && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-purple-50 text-purple-700 border border-purple-200 flex items-center gap-1 font-mono">
                          <Tag className="w-3 h-3" />
                          <span>Code: {banner.discountCode}</span>
                        </span>
                      )}
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                          banner.isActive && !isExpired
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-neutral-100 text-neutral-500'
                        }`}
                      >
                        {banner.isActive ? (isExpired ? 'Expired' : 'Active') : 'Disabled'}
                      </span>
                    </div>

                    <h4 className="text-base font-bold text-neutral-900">{banner.title}</h4>
                    <p className="text-xs text-neutral-600 leading-relaxed">{banner.subtitle}</p>

                    <div className="flex items-center gap-3 text-xs text-neutral-400 pt-1">
                      <span>Target: <strong className="text-neutral-700">{banner.targetCategory || 'All'}</strong></span>
                      <span aria-hidden="true">·</span>
                      <span>Button: <strong className="text-neutral-700">{banner.ctaText}</strong></span>
                      <span aria-hidden="true">·</span>
                      <span>Ends: <strong className="text-neutral-700">{new Date(banner.endsAt).toLocaleDateString('en-ZA', { dateStyle: 'medium' })}</strong></span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0 self-end md:self-center">
                    <button
                      onClick={() => handleToggleBanner(banner.id, banner.isActive)}
                      className={`px-3.5 py-2 text-xs font-semibold rounded-lg transition-colors border ${
                        banner.isActive
                          ? 'bg-white border-neutral-300 text-neutral-700 hover:bg-neutral-100'
                          : 'bg-neutral-900 border-neutral-900 text-white hover:bg-neutral-800'
                      }`}
                    >
                      {banner.isActive ? 'Deactivate' : 'Publish Banner'}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
