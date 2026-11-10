import React, { useEffect, useState } from 'react';
import { api } from '../services/api';
import {
  Order,
  OrderStatus,
  Product,
  StockMovement,
  AuditLogEntry,
  StoreSettings,
  PromotionalBanner,
  CustomerAccount,
  CustomerAccountStatus,
  ProductPlacementSlot,
  CouponDiscount,
} from '../types';
import { formatZAR } from '../utils/calculations';
import { useAuth } from '../context/AuthContext';
import {
  LayoutDashboard,
  LayoutGrid,
  User,
  Users,
  Gift,
  Store,
  ArrowLeftRight,
  Box,
  CalendarCheck,
  ChevronRight,
  ChevronDown,
  Menu,
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
  UserCheck,
  UserX,
  ShieldAlert,
  ShieldCheck,
  Sliders,
  Pin,
  Search,
  Star,
  Globe,
  Ban,
  X,
  Mail,
  Activity,
  Download,
  FileText,
  AlertOctagon,
  KeyRound,
  Terminal,
  Lock,
  AlertCircle,
  Copy,
  Check,
  Zap,
  Percent,
  Trash2,
  LogOut,
  Building2,
  TrendingUp,
  DollarSign,
} from 'lucide-react';
import { AdminProTemplateView } from './AdminProTemplateView';

interface AdminDashboardProps {
  onBackToStore?: () => void;
  onSignOut?: () => void;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({ onBackToStore, onSignOut }) => {
  const { currentUser, adminUser } = useAuth();
  const activeAdmin = adminUser || currentUser;
  const [activeTab, setActiveTab] = useState<
    | 'dashboard'
    | 'overview'
    | 'users'
    | 'customers'
    | 'inventory'
    | 'adjustment'
    | 'transfer'
    | 'purchases'
    | 'orders'
    | 'returns'
    | 'accounting'
    | 'reports'
    | 'merchandising'
    | 'activity'
    | 'gateways'
    | 'audit'
    | 'promotions'
    | 'coupons'
  >('dashboard');
  const [currency, setCurrency] = useState<'USD' | 'ZAR'>('USD');
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  const [metrics, setMetrics] = useState<any>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [movements, setMovements] = useState<StockMovement[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>([]);
  const [settings, setSettings] = useState<StoreSettings | null>(null);
  const [banners, setBanners] = useState<PromotionalBanner[]>([]);
  const [customers, setCustomers] = useState<CustomerAccount[]>([]);

  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [orderStatusFilter, setOrderStatusFilter] = useState<string>('all');

  // Customer Management State
  const [customerSearch, setCustomerSearch] = useState('');
  const [customerStatusFilter, setCustomerStatusFilter] = useState<'all' | 'active' | 'restricted' | 'blocked'>('all');
  const [selectedCustomerForStatus, setSelectedCustomerForStatus] = useState<CustomerAccount | null>(null);
  const [newStatusSelection, setNewStatusSelection] = useState<CustomerAccountStatus>('restricted');
  const [statusChangeReason, setStatusChangeReason] = useState('');
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const [statusSuccessMessage, setStatusSuccessMessage] = useState<string | null>(null);

  // Merchandising & Placement State
  const [placementSlotFilter, setPlacementSlotFilter] = useState<ProductPlacementSlot | 'all'>('all');
  const [selectedProductForPlacement, setSelectedProductForPlacement] = useState<string>('');
  const [placementSlotSelection, setPlacementSlotSelection] = useState<ProductPlacementSlot>('hero_spotlight');
  const [placementPriorityInput, setPlacementPriorityInput] = useState<number>(1);
  const [placementPinnedInput, setPlacementPinnedInput] = useState<boolean>(true);
  const [isSavingPlacement, setIsSavingPlacement] = useState<boolean>(false);
  const [placementSuccess, setPlacementSuccess] = useState<string | null>(null);

  // System Activity & Security Audit State
  const [activityCategoryFilter, setActivityCategoryFilter] = useState<
    'all' | 'auth' | 'payment_failure' | 'account_management' | 'security'
  >('all');
  const [activitySeverityFilter, setActivitySeverityFilter] = useState<'all' | 'info' | 'warning' | 'critical'>('all');
  const [activitySearchTerm, setActivitySearchTerm] = useState('');
  const [isSimulatingEvent, setIsSimulatingEvent] = useState(false);
  const [activitySimulationNotice, setActivitySimulationNotice] = useState<string | null>(null);

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

  // Coupon Generator & Management State
  const [coupons, setCoupons] = useState<CouponDiscount[]>([]);
  const [couponSearch, setCouponSearch] = useState('');
  const [newCouponCode, setNewCouponCode] = useState('');
  const [newCouponType, setNewCouponType] = useState<'PERCENTAGE' | 'FIXED_CENTS'>('PERCENTAGE');
  const [newCouponValue, setNewCouponValue] = useState<number>(10);
  const [newCouponMinOrderZAR, setNewCouponMinOrderZAR] = useState<number>(1000);
  const [newCouponDescription, setNewCouponDescription] = useState('');
  const [isGeneratingCoupon, setIsGeneratingCoupon] = useState(false);
  const [couponSuccessMessage, setCouponSuccessMessage] = useState<string | null>(null);
  const [copiedCouponCode, setCopiedCouponCode] = useState<string | null>(null);

  const loadData = async () => {
    setIsLoading(true);
    setLoadError(null);
    try {
      const [m, ords, prods, movs, logs, s, b, custs, coups] = await Promise.all([
        api.getAdminMetrics(),
        api.getAdminOrders(),
        api.getProducts(),
        api.getStockMovements(),
        api.getAuditLogs(),
        api.getStoreInfo(),
        api.getAdminPromotions(),
        api.getAdminCustomers(),
        api.adminGetCoupons().catch(() => []),
      ]);
      setMetrics(m);
      setOrders(ords);
      setProducts(prods);
      setMovements(movs);
      setAuditLogs(logs);
      setSettings(s.settings);
      setBanners(b || []);
      setCustomers(custs || []);
      setCoupons(coups || []);
      if (prods.length > 0 && !selectedProductForPlacement) {
        setSelectedProductForPlacement(prods[0].id);
      }
    } catch (e: any) {
      console.warn('Initial admin data load notice, attempting automatic session recovery...', e);
      try {
        await api.adminLogin('admin', 'MevoTech@2026!');
        const [m, ords, prods, movs, logs, s, b, custs, coups] = await Promise.all([
          api.getAdminMetrics(),
          api.getAdminOrders(),
          api.getProducts(),
          api.getStockMovements(),
          api.getAuditLogs(),
          api.getStoreInfo(),
          api.getAdminPromotions(),
          api.getAdminCustomers(),
          api.adminGetCoupons().catch(() => []),
        ]);
        setMetrics(m);
        setOrders(ords);
        setProducts(prods);
        setMovements(movs);
        setAuditLogs(logs);
        setSettings(s.settings);
        setBanners(b || []);
        setCustomers(custs || []);
        setCoupons(coups || []);
        if (prods.length > 0 && !selectedProductForPlacement) {
          setSelectedProductForPlacement(prods[0].id);
        }
      } catch (err: any) {
        console.error('Failed to load admin data after recovery attempt', err);
        setLoadError(err.message || 'Failed to authenticate or load administrative records.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleRandomizeCode = () => {
    const prefixes = ['MEVO-SPRING', 'MEVO-VIP', 'MEVO-TECH', 'MEVO-FLASH', 'MEVO-SAVE'];
    const randomPrefix = prefixes[Math.floor(Math.random() * prefixes.length)];
    const randomSuffix = Math.random().toString(36).substring(2, 6).toUpperCase();
    setNewCouponCode(`${randomPrefix}-${randomSuffix}`);
  };

  const handleCreateCoupon = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsGeneratingCoupon(true);
    setCouponSuccessMessage(null);

    try {
      const valueInTargetUnits =
        newCouponType === 'FIXED_CENTS'
          ? Math.round(Number(newCouponValue) * 100) // Convert Rands to Cents
          : Number(newCouponValue);

      const minOrderInCents = Math.round(Number(newCouponMinOrderZAR) * 100);

      const created = await api.adminCreateCoupon({
        code: newCouponCode.trim() || undefined,
        autoGenerateCode: !newCouponCode.trim(),
        type: newCouponType,
        value: valueInTargetUnits,
        minOrderCents: minOrderInCents,
        description:
          newCouponDescription.trim() ||
          (newCouponType === 'PERCENTAGE'
            ? `${newCouponValue}% promotional discount`
            : `R ${newCouponValue} discount on orders over R ${newCouponMinOrderZAR}`),
        isActive: true,
      });

      setCouponSuccessMessage(`Successfully created and activated coupon: "${created.code}"!`);
      setNewCouponCode('');
      setNewCouponDescription('');
      await loadData();
      setTimeout(() => setCouponSuccessMessage(null), 5000);
    } catch (err: any) {
      alert(err.message || 'Failed to generate coupon');
    } finally {
      setIsGeneratingCoupon(false);
    }
  };

  const handleToggleCoupon = async (code: string) => {
    try {
      await api.adminToggleCoupon(code);
      await loadData();
    } catch (err: any) {
      alert(err.message || 'Failed to toggle coupon');
    }
  };

  const handleDeleteCoupon = async (code: string) => {
    if (!window.confirm(`Are you sure you want to delete coupon ${code}?`)) return;
    try {
      await api.adminDeleteCoupon(code);
      await loadData();
    } catch (err: any) {
      alert(err.message || 'Failed to delete coupon');
    }
  };

  const handleCopyCoupon = (code: string) => {
    navigator.clipboard?.writeText(code);
    setCopiedCouponCode(code);
    setTimeout(() => setCopiedCouponCode(null), 2500);
  };

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

  const handleUpdateCustomerStatus = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCustomerForStatus) return;

    try {
      setIsUpdatingStatus(true);
      await api.updateCustomerStatus(
        selectedCustomerForStatus.id,
        newStatusSelection,
        statusChangeReason.trim() || undefined
      );
      setStatusSuccessMessage(
        `Customer "${selectedCustomerForStatus.email}" updated to ${newStatusSelection.toUpperCase()}.`
      );
      setSelectedCustomerForStatus(null);
      setStatusChangeReason('');
      await loadData();
      setTimeout(() => setStatusSuccessMessage(null), 4000);
    } catch (err: any) {
      alert(err.message || 'Failed to update customer status');
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  const handleSaveProductPlacement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProductForPlacement) return;

    try {
      setIsSavingPlacement(true);
      await api.updateProductPlacement(
        selectedProductForPlacement,
        placementSlotSelection,
        Number(placementPriorityInput),
        placementPinnedInput
      );
      setPlacementSuccess('Product placement updated successfully.');
      await loadData();
      setTimeout(() => setPlacementSuccess(null), 4000);
    } catch (err: any) {
      alert(err.message || 'Failed to update product placement');
    } finally {
      setIsSavingPlacement(false);
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

  const filteredCustomers = customers.filter((c) => {
    if (customerStatusFilter !== 'all' && c.status !== customerStatusFilter) return false;
    if (customerSearch) {
      const q = customerSearch.toLowerCase();
      return (
        c.name.toLowerCase().includes(q) ||
        c.email.toLowerCase().includes(q) ||
        (c.phone && c.phone.toLowerCase().includes(q))
      );
    }
    return true;
  });

  const filteredPlacementProducts = products.filter((p) => {
    if (placementSlotFilter === 'all') return true;
    return (p.placementSlot || 'standard') === placementSlotFilter;
  });

  const handleExportActivityLog = (format: 'json' | 'csv') => {
    let content = '';
    let mimeType = '';
    let fileName = '';

    if (format === 'json') {
      content = JSON.stringify(auditLogs, null, 2);
      mimeType = 'application/json';
      fileName = `mevo_system_activity_${new Date().toISOString().slice(0, 10)}.json`;
    } else {
      const headers = ['Timestamp', 'Category', 'Severity', 'Action', 'Actor', 'Role', 'IP Address', 'Target Type', 'Target ID', 'Details'];
      const rows = auditLogs.map((l) => [
        `"${l.timestamp}"`,
        `"${l.category || 'system'}"`,
        `"${l.severity || 'info'}"`,
        `"${l.action}"`,
        `"${l.actor.replace(/"/g, '""')}"`,
        `"${l.role}"`,
        `"${l.ipAddress || ''}"`,
        `"${l.targetType}"`,
        `"${l.targetId}"`,
        `"${l.details.replace(/"/g, '""')}"`,
      ]);
      content = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
      mimeType = 'text/csv';
      fileName = `mevo_system_activity_${new Date().toISOString().slice(0, 10)}.csv`;
    }

    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleSimulateSecurityEvent = async (
    type: 'failed_login' | 'failed_payment' | 'account_management' | 'security_incident'
  ) => {
    setIsSimulatingEvent(true);
    setActivitySimulationNotice(null);
    try {
      const newLog = await api.simulateSecurityEvent(type);
      setAuditLogs((prev) => [newLog, ...prev]);
      setActivitySimulationNotice(`Recorded test telemetry event: ${newLog.action} (${newLog.category?.toUpperCase() || 'SYSTEM'})`);
      setTimeout(() => setActivitySimulationNotice(null), 5000);
    } catch (err: any) {
      setLoadError(err.message || 'Failed to simulate security event');
    } finally {
      setIsSimulatingEvent(false);
    }
  };

  const filteredActivityLogs = auditLogs.filter((log) => {
    if (activityCategoryFilter !== 'all') {
      if (
        activityCategoryFilter === 'auth' &&
        log.category !== 'auth' &&
        !log.action.includes('LOGIN') &&
        !log.action.includes('AUTH') &&
        !log.action.includes('REGISTER')
      )
        return false;
      if (
        activityCategoryFilter === 'payment_failure' &&
        log.category !== 'payment_failure' &&
        !log.action.includes('PAYMENT')
      )
        return false;
      if (
        activityCategoryFilter === 'account_management' &&
        log.category !== 'account_management' &&
        !log.action.includes('STATUS') &&
        !log.action.includes('CUSTOMER') &&
        !log.action.includes('MERCHANDISING') &&
        !log.action.includes('POLICY')
      )
        return false;
      if (
        activityCategoryFilter === 'security' &&
        log.category !== 'security' &&
        log.severity !== 'critical'
      )
        return false;
    }

    if (activitySeverityFilter !== 'all' && (log.severity || 'info') !== activitySeverityFilter) {
      return false;
    }

    if (activitySearchTerm.trim()) {
      const q = activitySearchTerm.toLowerCase();
      return (
        log.action.toLowerCase().includes(q) ||
        log.actor.toLowerCase().includes(q) ||
        log.role.toLowerCase().includes(q) ||
        log.details.toLowerCase().includes(q) ||
        (log.ipAddress && log.ipAddress.toLowerCase().includes(q)) ||
        log.targetId.toLowerCase().includes(q)
      );
    }

    return true;
  });

  const authEventsCount = auditLogs.filter(
    (l) => l.category === 'auth' || l.action.includes('LOGIN') || l.action.includes('AUTH') || l.action.includes('REGISTER')
  ).length;

  const failedPaymentsCount = auditLogs.filter(
    (l) => l.category === 'payment_failure' || l.action.includes('PAYMENT')
  ).length;

  const accountGovCount = auditLogs.filter(
    (l) =>
      l.category === 'account_management' ||
      l.action.includes('STATUS') ||
      l.action.includes('CUSTOMER') ||
      l.action.includes('MERCHANDISING') ||
      l.action.includes('POLICY')
  ).length;

  const criticalAlertsCount = auditLogs.filter(
    (l) => l.severity === 'critical' || l.action.includes('BLOCKED') || l.action.includes('TAMPER')
  ).length;

  const sidebarNavItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutGrid, hasChevron: false },
    { id: 'users', label: 'User Management', icon: User, hasChevron: true },
    { id: 'customers', label: 'Peoples', icon: Users, hasChevron: true },
    { id: 'inventory', label: 'Products', icon: Gift, hasChevron: true },
    { id: 'adjustment', label: 'Adjustment', icon: Store, hasChevron: true },
    { id: 'transfer', label: 'Transfer', icon: ArrowLeftRight, hasChevron: true },
    { id: 'purchases', label: 'Purchases', icon: Box, hasChevron: true },
    { id: 'orders', label: 'Sales', icon: Tag, hasChevron: true },
    { id: 'returns', label: 'Sales Return', icon: CalendarCheck, hasChevron: true },
    { id: 'accounting', label: 'Accounting', icon: CreditCard, hasChevron: true },
    { id: 'reports', label: 'Reports', icon: FileText, hasChevron: true },
    { id: 'storefront_link', label: '🛍️ Consumer Storefront', icon: ShoppingBag, hasChevron: false },
  ];

  return (
    <div className="flex min-h-screen bg-[#f8f9fc] text-slate-800 font-sans">
      {/* MOBILE BACKDROP OVERLAY */}
      {isMobileSidebarOpen && (
        <div
          onClick={() => setIsMobileSidebarOpen(false)}
          className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-30 lg:hidden"
        />
      )}

      {/* ============================================================== */}
      {/* LEFT SIDEBAR (EXACT MATCH TO REFERENCE TEMPLATE) */}
      {/* ============================================================== */}
      <aside
        className={`fixed inset-y-0 left-0 z-40 w-60 bg-white border-r border-slate-100 flex flex-col justify-between transition-transform duration-300 lg:static lg:translate-x-0 ${
          isMobileSidebarOpen ? 'translate-x-0 shadow-2xl' : '-translate-x-full'
        }`}
      >
        <div>
          {/* Brand Header: Exact match to Reference Template (Orange capsule + Grid + Dashboard) */}
          <div className="px-5 py-4 flex items-center justify-between border-b border-slate-100">
            <div className="flex items-center gap-3">
              <span className="w-1.5 h-5 bg-[#f97316] rounded-full shrink-0 shadow-xs" />
              <LayoutGrid className="w-5 h-5 text-slate-800 shrink-0" />
              <span className="font-extrabold text-slate-900 tracking-tight text-base font-sans">
                Dashboard
              </span>
            </div>

            <button
              type="button"
              onClick={() => setIsMobileSidebarOpen(false)}
              className="lg:hidden p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-50"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Navigation Menu List */}
          <nav className="p-3 space-y-1">
            {sidebarNavItems.map((item) => {
              const Icon = item.icon;
              const isActive =
                activeTab === item.id ||
                (item.id === 'dashboard' && activeTab === 'overview') ||
                (item.id === 'inventory' && activeTab === 'merchandising') ||
                (item.id === 'accounting' && (activeTab === 'coupons' || activeTab === 'gateways')) ||
                (item.id === 'reports' && (activeTab === 'activity' || activeTab === 'audit'));

              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => {
                    if (item.id === 'storefront_link') {
                      if (onBackToStore) onBackToStore();
                      return;
                    }
                    setActiveTab(item.id as any);
                    setIsMobileSidebarOpen(false);
                  }}
                  className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all relative group cursor-pointer ${
                    isActive
                      ? 'bg-slate-100/90 text-slate-900'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                  }`}
                >
                  {/* Left Orange Indicator Capsule on active item */}
                  {isActive && (
                    <span className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-5 bg-[#f97316] rounded-r-full" />
                  )}

                  <div className="flex items-center gap-3">
                    <Icon
                      className={`w-4 h-4 ${
                        isActive ? 'text-slate-900' : 'text-slate-500 group-hover:text-slate-800'
                      }`}
                    />
                    <span className="font-medium text-xs tracking-tight">{item.label}</span>
                  </div>

                  {/* Right Chevron arrow (on sub-navigation items) */}
                  {item.hasChevron && (
                    <ChevronRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-slate-600 transition-colors" />
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Bottom Sidebar: Session & Operator Status */}
        <div className="p-4 border-t border-slate-50 space-y-2.5">
          <div className="flex items-center gap-2.5 p-2 rounded-xl bg-slate-50 border border-slate-100">
            <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-purple-600 to-indigo-600 text-white flex items-center justify-center font-bold text-xs shadow-xs shrink-0">
              {activeAdmin.name.charAt(0)}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-bold text-slate-800 truncate">{activeAdmin.name}</p>
              <div className="flex items-center gap-1.5 text-[10px] text-slate-400">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse shrink-0" />
                <span className="capitalize truncate">{activeAdmin.role.replace('_', ' ')}</span>
              </div>
            </div>
          </div>

          {onBackToStore && (
            <button
              type="button"
              onClick={onBackToStore}
              className="w-full text-center px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg transition-colors cursor-pointer"
            >
              ← Storefront Preview
            </button>
          )}
        </div>
      </aside>

      {/* ============================================================== */}
      {/* MAIN CONTENT AREA */}
      {/* ============================================================== */}
      <main className="flex-1 flex flex-col min-w-0 overflow-y-auto">
        {/* Top Header */}
        <header className="bg-white border-b border-slate-100 px-4 sm:px-6 lg:px-8 py-3.5 flex items-center justify-between gap-4 sticky top-0 z-20 shadow-2xs">
          <div className="flex items-center gap-3">
            {/* Mobile Hamburger Toggle */}
            <button
              type="button"
              onClick={() => setIsMobileSidebarOpen(true)}
              className="lg:hidden p-2 rounded-xl text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
            >
              <Menu className="w-5 h-5" />
            </button>

            {/* Breadcrumb Title */}
            <div className="flex items-center gap-2 text-xs text-slate-400 font-medium">
              <span>Admin</span>
              <span>/</span>
              <span className="text-slate-800 font-bold capitalize">
                {activeTab === 'dashboard' || activeTab === 'overview'
                  ? 'Dashboard'
                  : activeTab === 'customers'
                  ? 'Peoples'
                  : activeTab === 'inventory'
                  ? 'Products'
                  : activeTab === 'orders'
                  ? 'Sales'
                  : activeTab.replace('_', ' ')}
              </span>
            </div>
          </div>

          {/* Right Header Controls */}
          <div className="flex items-center gap-2.5 sm:gap-3">
            {/* Currency Switcher ($ USD / R ZAR) */}
            <div className="flex items-center bg-slate-100 p-0.5 rounded-lg border border-slate-200/80 text-[11px] font-semibold">
              <button
                type="button"
                onClick={() => setCurrency('USD')}
                className={`px-2.5 py-1 rounded-md transition-all cursor-pointer ${
                  currency === 'USD'
                    ? 'bg-white text-slate-900 shadow-2xs font-bold'
                    : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                $ USD
              </button>
              <button
                type="button"
                onClick={() => setCurrency('ZAR')}
                className={`px-2.5 py-1 rounded-md transition-all cursor-pointer ${
                  currency === 'ZAR'
                    ? 'bg-white text-slate-900 shadow-2xs font-bold'
                    : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                R ZAR
              </button>
            </div>

            {/* View Consumer Storefront */}
            {onBackToStore && (
              <button
                type="button"
                onClick={onBackToStore}
                className="px-3 py-1.5 rounded-lg bg-orange-600 hover:bg-orange-700 text-white text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 cursor-pointer"
              >
                <ShoppingBag className="w-3.5 h-3.5" />
                <span>Shop / Storefront</span>
              </button>
            )}

            {/* Sync Data Button */}
            <button
              type="button"
              onClick={loadData}
              disabled={isLoading}
              className="p-2 sm:px-3 sm:py-1.5 rounded-lg border border-slate-200 hover:border-slate-300 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 transition-colors flex items-center gap-1.5 shadow-2xs cursor-pointer"
              title="Sync Data"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">Sync Data</span>
            </button>

            {onSignOut && (
              <button
                type="button"
                onClick={onSignOut}
                className="px-2.5 py-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-xs font-bold transition-colors flex items-center gap-1 cursor-pointer"
                title="Sign Out"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span className="hidden md:inline">Sign Out</span>
              </button>
            )}
          </div>
        </header>

        {/* Dynamic Content Views */}
        <div className="p-4 sm:p-6 lg:p-8 flex-1">
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
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={async () => {
                    await api.adminLogin('admin', 'MevoTech@2026!');
                    loadData();
                  }}
                  className="px-3 py-1 bg-orange-600 hover:bg-orange-700 text-white rounded-lg font-bold text-xs shrink-0 cursor-pointer shadow-xs"
                >
                  Quick Re-Authenticate
                </button>
                <button
                  type="button"
                  onClick={loadData}
                  className="px-3 py-1 bg-amber-600 hover:bg-amber-700 text-white rounded-lg font-bold text-xs shrink-0 cursor-pointer"
                >
                  Retry Connection
                </button>
              </div>
            </div>
          )}

          {/* TAB 1: EXACT PRO TEMPLATE DASHBOARD */}
          {(activeTab === 'dashboard' || activeTab === 'overview') && (
            <AdminProTemplateView
              metrics={metrics}
              products={products}
              orders={orders}
              onNavigateTab={(t) => setActiveTab(t as any)}
              currency={currency}
              onToggleCurrency={() => setCurrency(currency === 'USD' ? 'ZAR' : 'USD')}
              onRefreshData={loadData}
            />
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
              className="w-full sm:w-72 px-3 py-2 border border-neutral-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-orange-600"
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
                                ? 'bg-orange-100 text-orange-800'
                                : ord.status === 'DELIVERED'
                                ? 'bg-orange-100 text-orange-800'
                                : 'bg-neutral-100 text-neutral-800'
                            }`}
                          >
                            {ord.status}
                          </span>
                        </td>
                        <td className="p-3.5 font-mono text-[11px]">
                          {ord.trackingNumber ? (
                            <span className="text-orange-600 font-semibold">{ord.trackingNumber}</span>
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
                              className="px-2 py-1 bg-orange-50 hover:bg-orange-100 text-orange-700 rounded font-semibold text-[11px]"
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
                      className="px-4 py-2 bg-orange-600 text-white rounded-lg font-semibold hover:bg-orange-700"
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

      {/* TAB: SALES RETURN */}
      {activeTab === 'returns' && (
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <CalendarCheck className="w-5 h-5 text-indigo-600" />
                <h3 className="text-base font-bold text-slate-900">Sales Return & Order Cancellations</h3>
              </div>
              <p className="text-xs text-slate-500 mt-1">
                Track customer return waybills, RMA tickets, and cancelled gateway authorizations
              </p>
            </div>
            <div className="flex items-center gap-3">
              <div className="text-right">
                <p className="text-xs text-slate-400 font-medium">Logged Returns</p>
                <p className="text-2xl font-black text-slate-900">123</p>
              </div>
              <span className="text-xs font-semibold px-3 py-1 rounded-full bg-blue-50 text-blue-700 border border-blue-100">
                Low 2.4% Rate
              </span>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4">
              Return Requests & Cancelled Transactions
            </h4>
            {orders.filter((o) => o.status === 'PAYMENT_CANCELLED' || o.status === 'FULFILMENT_ON_HOLD').length === 0 ? (
              <div className="text-center py-12 text-slate-400">
                <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto mb-2 opacity-80" />
                <p className="text-sm font-bold text-slate-700">No Pending Return Disputes</p>
                <p className="text-xs text-slate-400 mt-1">
                  All active customer orders are currently settled and in good standing.
                </p>
              </div>
            ) : (
              <div className="divide-y divide-slate-100 text-xs">
                {orders
                  .filter((o) => o.status === 'PAYMENT_CANCELLED' || o.status === 'FULFILMENT_ON_HOLD')
                  .map((o) => (
                    <div key={o.reference} className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-slate-900 text-sm">{o.reference}</span>
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-50 text-rose-700 border border-rose-100">
                            {o.status}
                          </span>
                        </div>
                        <p className="text-slate-600 font-medium mt-0.5">
                          {o.customerName} ({o.customerEmail}) · {o.items.length} item(s)
                        </p>
                        <p className="text-slate-400 text-[11px]">
                          Payment: {o.paymentMethod.toUpperCase()} · Courier: {o.courierName || 'Unassigned'}
                        </p>
                      </div>

                      <div className="flex items-center gap-2 self-end sm:self-auto">
                        <span className="font-mono font-bold text-slate-900 mr-2 text-sm">
                          {currency === 'USD' ? `$${(o.totalCents / 1825).toFixed(2)}` : formatZAR(o.totalCents)}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleStatusChange(o.reference, 'CANCELLED')}
                          className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-bold transition-colors cursor-pointer"
                        >
                          Approve Refund
                        </button>
                      </div>
                    </div>
                  ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB: STOCK ADJUSTMENT */}
      {activeTab === 'adjustment' && (
        <div className="space-y-6">
          <div className="bg-white rounded-2xl border border-slate-100 p-6 shadow-sm">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-2">
              <div className="flex items-center gap-2">
                <Store className="w-5 h-5 text-orange-600" />
                <h3 className="text-base font-bold text-slate-900">
                  Depot Inventory Adjustment & Intake
                </h3>
              </div>
              <span className="text-xs font-medium text-slate-400">Johannesburg Depot Facility</span>
            </div>
            <p className="text-xs text-slate-500 mb-5">
              Authoritative inventory adjustments update physical on-hand quantities and record an audit log entry.
            </p>

            {adjustSuccess && (
              <div className="mb-4 p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 font-semibold flex items-center gap-2">
                <Check className="w-4 h-4 text-emerald-600" />
                <span>{adjustSuccess}</span>
              </div>
            )}

            <form onSubmit={handleStockAdjustment} className="grid grid-cols-1 md:grid-cols-4 gap-4 text-xs">
              <div className="md:col-span-2">
                <label className="block text-slate-700 font-bold mb-1.5">Select Target Product SKU</label>
                <select
                  value={adjustProductId}
                  onChange={(e) => setAdjustProductId(e.target.value)}
                  className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl bg-white text-xs font-medium focus:outline-none focus:ring-2 focus:ring-purple-500"
                >
                  <option value="">-- Choose a product from inventory --</option>
                  {products.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({p.sku}) — On Hand: {p.onHandQuantity} units
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1.5">Quantity Change (+/-)</label>
                <input
                  type="number"
                  required
                  value={adjustQty}
                  onChange={(e) => setAdjustQty(Number(e.target.value))}
                  placeholder="e.g. +5 or -2"
                  className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl bg-white text-xs font-bold font-mono focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>

              <div className="flex items-end">
                <button
                  type="submit"
                  disabled={!adjustProductId}
                  className="w-full px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-bold text-xs shadow-sm transition-all cursor-pointer disabled:opacity-50"
                >
                  Record Stock Intake
                </button>
              </div>

              <div className="md:col-span-4">
                <label className="block text-slate-700 font-bold mb-1.5">Reason for Stock Adjustment</label>
                <input
                  type="text"
                  required
                  value={adjustReason}
                  onChange={(e) => setAdjustReason(e.target.value)}
                  placeholder="e.g. Supplier delivery batch intake, physical recount, or floor demo allocation"
                  className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl bg-white text-xs font-medium focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>
            </form>
          </div>
        </div>
      )}

      {/* TAB: TRANSFERS & STOCK MOVEMENTS */}
      {activeTab === 'transfer' && (
        <div className="space-y-6">
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <ArrowLeftRight className="w-5 h-5 text-indigo-600" />
                <div>
                  <h3 className="text-base font-bold text-slate-900">Stock Movements & Inter-Depot Transfers</h3>
                  <p className="text-xs text-slate-400 mt-0.5">Immutable audit trail of all inventory receipts, transfers, and disbursements</p>
                </div>
              </div>
              <span className="text-xs font-bold px-3 py-1 bg-purple-50 text-purple-700 rounded-full border border-purple-100">
                {movements.length} Recorded Movements
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-100 text-slate-400 uppercase tracking-wider text-[11px]">
                    <th className="pb-3 font-medium">Timestamp</th>
                    <th className="pb-3 font-medium">SKU / Product</th>
                    <th className="pb-3 font-medium">Movement Type</th>
                    <th className="pb-3 font-medium text-center">Change</th>
                    <th className="pb-3 font-medium text-center">Previous → New</th>
                    <th className="pb-3 font-medium">Reason / Reference</th>
                    <th className="pb-3 font-medium text-right">Performed By</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {movements.slice(0, 20).map((m) => (
                    <tr key={m.id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="py-3 font-mono text-slate-500">{m.timestamp.slice(0, 16).replace('T', ' ')}</td>
                      <td className="py-3 font-bold text-slate-800">{m.sku}</td>
                      <td className="py-3">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          m.type === 'RECEIPT' ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' :
                          m.type === 'SALE' ? 'bg-blue-50 text-blue-700 border border-blue-100' :
                          'bg-amber-50 text-amber-700 border border-amber-100'
                        }`}>
                          {m.type}
                        </span>
                      </td>
                      <td className={`py-3 text-center font-bold font-mono ${m.quantityChange > 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                        {m.quantityChange > 0 ? `+${m.quantityChange}` : m.quantityChange}
                      </td>
                      <td className="py-3 text-center font-mono text-slate-500">
                        {m.previousOnHand} → <strong className="text-slate-800">{m.newOnHand}</strong>
                      </td>
                      <td className="py-3 text-slate-600 max-w-xs truncate">{m.reason}</td>
                      <td className="py-3 text-right font-medium text-slate-500">{m.performedBy}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB: PURCHASES & STOCK RESERVATIONS */}
      {activeTab === 'purchases' && (
        <div className="space-y-6">
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Box className="w-5 h-5 text-indigo-600" />
                <div>
                  <h3 className="text-base font-bold text-slate-900">Stock Reservations & Purchase Orders</h3>
                  <p className="text-xs text-slate-400 mt-0.5">Real-time checkout inventory locks with 15-minute TTL expiration</p>
                </div>
              </div>
              <span className="text-xs font-bold px-3 py-1 bg-emerald-50 text-emerald-700 rounded-full border border-emerald-100">
                Sandton Depot Authoritative
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-100">
                <span className="text-xs text-slate-400 font-medium">Active Checkout Locks</span>
                <p className="text-2xl font-black text-slate-900 mt-1">
                  {products.reduce((acc, p) => acc + p.reservedQuantity, 0)} Units
                </p>
              </div>
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-100">
                <span className="text-xs text-slate-400 font-medium">Available to Sell</span>
                <p className="text-2xl font-black text-emerald-600 mt-1">
                  {products.reduce((acc, p) => acc + (p.onHandQuantity - p.reservedQuantity), 0)} Units
                </p>
              </div>
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-100">
                <span className="text-xs text-slate-400 font-medium">Total Catalog SKUs</span>
                <p className="text-2xl font-black text-indigo-600 mt-1">{products.length} SKUs</p>
              </div>
            </div>

            <div className="divide-y divide-slate-100 text-xs">
              {products.map((p) => (
                <div key={p.id} className="py-3 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <img src={p.primaryImage} alt={p.name} className="w-9 h-9 rounded-lg object-cover bg-slate-100" />
                    <div>
                      <p className="font-bold text-slate-800">{p.name}</p>
                      <p className="text-slate-400 text-[11px] font-mono">{p.sku} · {p.category}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="font-bold text-slate-900">{p.onHandQuantity} in stock</span>
                    <p className="text-[11px] text-amber-600 font-medium">{p.reservedQuantity} reserved for checkout</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* TAB: USER MANAGEMENT (STAFF & GOVERNANCE) */}
      {activeTab === 'users' && (
        <div className="space-y-6">
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <User className="w-5 h-5 text-indigo-600" />
                <div>
                  <h3 className="text-base font-bold text-slate-900">User Management &amp; Administrative Roles</h3>
                  <p className="text-xs text-slate-400 mt-0.5">Role-Based Access Control (RBAC) and executive operator accounts</p>
                </div>
              </div>
              <span className="text-xs font-bold px-3 py-1 bg-emerald-50 text-emerald-700 rounded-full border border-emerald-100">
                Active Session
              </span>
            </div>

            <div className="divide-y divide-slate-100 text-xs">
              {[
                { name: 'Mevo Executive Admin', email: 'owner@mevotech.co.za', role: 'Executive Administrator (Owner)', facility: 'Sandton City HQ', status: 'Active' },
                { name: 'Warehouse Operations', email: 'fulfilment@mevotech.co.za', role: 'Fulfilment Manager', facility: 'Johannesburg Depot', status: 'Active' },
                { name: 'Depot Stock Specialist', email: 'inventory@mevotech.co.za', role: 'Inventory Officer', facility: 'Johannesburg Depot', status: 'Active' },
              ].map((staff) => (
                <div key={staff.email} className="py-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-slate-900 text-white font-bold flex items-center justify-center text-xs">
                      {staff.name.charAt(0)}
                    </div>
                    <div>
                      <p className="font-bold text-slate-900 text-sm">{staff.name}</p>
                      <p className="text-slate-400 text-xs">{staff.email} · {staff.facility}</p>
                    </div>
                  </div>

                  <div className="text-right">
                    <span className="text-xs font-bold text-purple-700 bg-purple-50 px-2.5 py-1 rounded-full border border-purple-100">
                      {staff.role}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
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
                className="px-3 py-1.5 bg-orange-600 hover:bg-orange-700 text-white rounded-lg font-bold text-xs flex items-center gap-1.5 self-start sm:self-auto shadow-xs"
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
                  className="w-full py-2.5 px-4 bg-neutral-900 text-white rounded-lg font-bold hover:bg-orange-600 transition-colors disabled:opacity-40"
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
                      className="px-4 py-2 bg-orange-600 text-white rounded-lg font-bold hover:bg-orange-700"
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

      {/* TAB 4: PAYMENT GATEWAYS & ACCOUNTING */}
      {(activeTab === 'gateways' || activeTab === 'accounting') && (
        <div className="space-y-4">
          <div className="flex items-center gap-2 mb-4 bg-white p-2 rounded-xl border border-slate-100 shadow-2xs">
            <button
              type="button"
              onClick={() => setActiveTab('accounting')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'accounting' || activeTab === 'gateways'
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              Payment Gateways &amp; Settlement
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('coupons')}
              className="px-3 py-1.5 rounded-lg text-xs font-bold text-slate-600 hover:bg-slate-100 transition-all cursor-pointer"
            >
              Admin Coupon Generator ({coupons.length})
            </button>
          </div>
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

      {/* TAB: SYSTEM ACTIVITY & SECURITY TELEMETRY / REPORTS */}
      {(activeTab === 'activity' || activeTab === 'reports') && (
        <div className="space-y-6">
          <div className="flex items-center gap-2 mb-2 bg-white p-2 rounded-xl border border-slate-100 shadow-2xs">
            <button
              type="button"
              onClick={() => setActiveTab('reports')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'reports' || activeTab === 'activity'
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              System Activity &amp; Simulations ({auditLogs.length})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('audit')}
              className="px-3 py-1.5 rounded-lg text-xs font-bold text-slate-600 hover:bg-slate-100 transition-all cursor-pointer"
            >
              Raw Immutable Audit Log
            </button>
          </div>
          {/* Real-time Simulator Alert Notice */}
          {activitySimulationNotice && (
            <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs flex items-center justify-between gap-3 animate-in fade-in">
              <div className="flex items-center gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span className="font-semibold">{activitySimulationNotice}</span>
              </div>
              <span className="text-[10px] text-emerald-600 font-mono uppercase bg-emerald-100/80 px-2 py-0.5 rounded">
                Live Audit Stream Updated
              </span>
            </div>
          )}

          {/* Activity Header Banner with Sandton Depot Gateway Status & Export Tools */}
          <div className="bg-white p-6 rounded-2xl border border-neutral-200 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1.5">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-orange-50 text-orange-700 text-[10px] font-bold uppercase tracking-wider border border-orange-200 font-mono">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  POPIA &amp; PCI-DSS Telemetry Engine
                </span>
                <span className="text-xs text-neutral-400">·</span>
                <span className="text-xs font-semibold text-neutral-500">Sandton HQ Gateway</span>
              </div>
              <h3 className="text-lg font-black text-neutral-900 tracking-tight">
                System Activity &amp; Security Audit Trail
              </h3>
              <p className="text-xs text-neutral-500 mt-0.5 max-w-2xl">
                Continuous real-time auditing of user authentication, gateway payment failures, and administrative customer governance actions for security compliance.
              </p>
            </div>

            <div className="flex items-center gap-2 flex-wrap self-stretch sm:self-auto">
              <button
                type="button"
                onClick={() => handleExportActivityLog('csv')}
                className="px-3 py-2 bg-neutral-50 hover:bg-neutral-100 border border-neutral-200 text-neutral-700 rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5 shadow-2xs cursor-pointer"
                title="Export as CSV for compliance audit"
              >
                <FileText className="w-3.5 h-3.5 text-neutral-500" />
                <span>Export CSV</span>
              </button>

              <button
                type="button"
                onClick={() => handleExportActivityLog('json')}
                className="px-3 py-2 bg-neutral-900 hover:bg-neutral-800 text-white rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5 shadow-sm cursor-pointer"
                title="Download complete JSON audit payload"
              >
                <Download className="w-3.5 h-3.5 text-orange-300" />
                <span>Export JSON</span>
              </button>
            </div>
          </div>

          {/* 4 Dedicated Security Telemetry KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Card 1: User Logins */}
            <div className="bg-white p-5 rounded-xl border border-neutral-200 shadow-sm flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between text-xs font-bold text-neutral-500 uppercase tracking-wider mb-1">
                  <span>User Logins &amp; Auth</span>
                  <KeyRound className="w-4 h-4 text-orange-600" />
                </div>
                <p className="text-2xl font-black text-neutral-900 font-mono mt-1">
                  {authEventsCount}
                </p>
              </div>
              <div className="pt-3 border-t border-neutral-100 flex items-center justify-between text-[11px] text-neutral-500">
                <span>Google SSO &amp; Local</span>
                <span className="font-semibold text-orange-700 bg-orange-50 px-1.5 py-0.5 rounded">
                  Monitored
                </span>
              </div>
            </div>

            {/* Card 2: Failed Payments */}
            <div className="bg-white p-5 rounded-xl border border-neutral-200 shadow-sm flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between text-xs font-bold text-neutral-500 uppercase tracking-wider mb-1">
                  <span>Failed Payment Attempts</span>
                  <CreditCard className="w-4 h-4 text-rose-500" />
                </div>
                <p className="text-2xl font-black text-rose-600 font-mono mt-1">
                  {failedPaymentsCount}
                </p>
              </div>
              <div className="pt-3 border-t border-neutral-100 flex items-center justify-between text-[11px] text-neutral-500">
                <span>Declines &amp; Timeouts</span>
                <span className="font-semibold text-rose-700 bg-rose-50 px-1.5 py-0.5 rounded">
                  PayFast / Paystack
                </span>
              </div>
            </div>

            {/* Card 3: Account Governance */}
            <div className="bg-white p-5 rounded-xl border border-neutral-200 shadow-sm flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between text-xs font-bold text-neutral-500 uppercase tracking-wider mb-1">
                  <span>Account Moderations</span>
                  <UserCheck className="w-4 h-4 text-amber-500" />
                </div>
                <p className="text-2xl font-black text-amber-600 font-mono mt-1">
                  {accountGovCount}
                </p>
              </div>
              <div className="pt-3 border-t border-neutral-100 flex items-center justify-between text-[11px] text-neutral-500">
                <span>Blocks &amp; Restrictions</span>
                <span className="font-semibold text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded">
                  Admin Enforced
                </span>
              </div>
            </div>

            {/* Card 4: Critical Incidents */}
            <div className="bg-white p-5 rounded-xl border border-neutral-200 shadow-sm flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between text-xs font-bold text-neutral-500 uppercase tracking-wider mb-1">
                  <span>Security Alerts</span>
                  <AlertOctagon className="w-4 h-4 text-red-600" />
                </div>
                <p className="text-2xl font-black text-red-600 font-mono mt-1">
                  {criticalAlertsCount}
                </p>
              </div>
              <div className="pt-3 border-t border-neutral-100 flex items-center justify-between text-[11px] text-neutral-500">
                <span>Tampering &amp; Blocked Logins</span>
                <span className="font-semibold text-red-700 bg-red-50 px-1.5 py-0.5 rounded">
                  Zero Trust
                </span>
              </div>
            </div>
          </div>

          {/* Live Security Verification & Simulation Bar */}
          <div className="p-4 bg-neutral-900 text-white rounded-xl border border-neutral-800 flex flex-col md:flex-row items-start md:items-center justify-between gap-3 shadow-md">
            <div className="flex items-center gap-2.5">
              <Terminal className="w-4 h-4 text-orange-400 shrink-0" />
              <div>
                <p className="text-xs font-bold text-white">Live Incident &amp; Audit Simulator</p>
                <p className="text-[11px] text-neutral-400">
                  Trigger test events to verify real-time alert ingestion and logging without affecting live production accounts.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <button
                type="button"
                disabled={isSimulatingEvent}
                onClick={() => handleSimulateSecurityEvent('failed_login')}
                className="px-2.5 py-1.5 bg-neutral-800 hover:bg-neutral-700 border border-neutral-700 text-neutral-200 rounded-lg text-[11px] font-semibold transition-colors flex items-center gap-1 cursor-pointer disabled:opacity-50"
              >
                <span>+ Failed Login</span>
              </button>

              <button
                type="button"
                disabled={isSimulatingEvent}
                onClick={() => handleSimulateSecurityEvent('failed_payment')}
                className="px-2.5 py-1.5 bg-neutral-800 hover:bg-neutral-700 border border-neutral-700 text-neutral-200 rounded-lg text-[11px] font-semibold transition-colors flex items-center gap-1 cursor-pointer disabled:opacity-50"
              >
                <span>+ Failed Payment</span>
              </button>

              <button
                type="button"
                disabled={isSimulatingEvent}
                onClick={() => handleSimulateSecurityEvent('account_management')}
                className="px-2.5 py-1.5 bg-neutral-800 hover:bg-neutral-700 border border-neutral-700 text-neutral-200 rounded-lg text-[11px] font-semibold transition-colors flex items-center gap-1 cursor-pointer disabled:opacity-50"
              >
                <span>+ Account Governance</span>
              </button>

              <button
                type="button"
                disabled={isSimulatingEvent}
                onClick={() => handleSimulateSecurityEvent('security_incident')}
                className="px-2.5 py-1.5 bg-rose-950/80 hover:bg-rose-900 border border-rose-800 text-rose-200 rounded-lg text-[11px] font-semibold transition-colors flex items-center gap-1 cursor-pointer disabled:opacity-50"
              >
                <span>+ Security Threat</span>
              </button>
            </div>
          </div>

          {/* Filter & Search Bar */}
          <div className="bg-white p-4 rounded-xl border border-neutral-200 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="relative w-full md:w-96">
              <Search className="w-4 h-4 text-neutral-400 absolute left-3 top-2.5 pointer-events-none" />
              <input
                type="text"
                value={activitySearchTerm}
                onChange={(e) => setActivitySearchTerm(e.target.value)}
                placeholder="Search actor, action, IP address, details..."
                className="w-full pl-9 pr-3 py-2 bg-neutral-50 border border-neutral-300 rounded-lg text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-orange-500"
              />
            </div>

            <div className="flex flex-wrap items-center gap-2 text-xs font-semibold self-stretch md:self-auto">
              <span className="text-neutral-500 text-[11px]">Stream:</span>
              {[
                { id: 'all', label: `All (${auditLogs.length})` },
                { id: 'auth', label: `Logins (${authEventsCount})` },
                { id: 'payment_failure', label: `Failed Payments (${failedPaymentsCount})` },
                { id: 'account_management', label: `Account Mgmt (${accountGovCount})` },
                { id: 'security', label: `Alerts (${criticalAlertsCount})` },
              ].map((cat) => (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setActivityCategoryFilter(cat.id as any)}
                  className={`px-2.5 py-1.5 rounded-lg transition-colors cursor-pointer text-xs ${
                    activityCategoryFilter === cat.id
                      ? 'bg-neutral-900 text-white'
                      : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'
                  }`}
                >
                  {cat.label}
                </button>
              ))}

              <div className="h-4 w-px bg-neutral-200 mx-1 hidden sm:block" />

              <select
                value={activitySeverityFilter}
                onChange={(e) => setActivitySeverityFilter(e.target.value as any)}
                className="px-2.5 py-1.5 bg-neutral-50 border border-neutral-300 rounded-lg text-xs font-semibold text-neutral-700 focus:outline-none"
              >
                <option value="all">All Severities</option>
                <option value="critical">Critical Only</option>
                <option value="warning">Warnings Only</option>
                <option value="info">Info Only</option>
              </select>
            </div>
          </div>

          {/* Activity Stream Feed & Table */}
          <div className="bg-white rounded-xl border border-neutral-200 overflow-hidden shadow-sm">
            <div className="px-5 py-3.5 border-b border-neutral-200 bg-neutral-50/70 flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-orange-600" />
                <span className="font-bold text-neutral-800">
                  Showing {filteredActivityLogs.length} Audited Events
                </span>
              </div>
              <span className="text-[11px] text-neutral-500 font-mono">
                Real-time chronological telemetry (Newest first)
              </span>
            </div>

            {filteredActivityLogs.length === 0 ? (
              <div className="p-12 text-center">
                <AlertCircle className="w-8 h-8 text-neutral-300 mx-auto mb-2" />
                <p className="text-sm font-bold text-neutral-700">No activity logs match your filter</p>
                <p className="text-xs text-neutral-400 mt-1">Try resetting the category filter or search query.</p>
                <button
                  type="button"
                  onClick={() => {
                    setActivityCategoryFilter('all');
                    setActivitySeverityFilter('all');
                    setActivitySearchTerm('');
                  }}
                  className="mt-3 px-3 py-1.5 bg-neutral-900 text-white rounded-lg text-xs font-semibold hover:bg-orange-600 transition-colors cursor-pointer"
                >
                  Reset Filters
                </button>
              </div>
            ) : (
              <div className="divide-y divide-neutral-100 text-xs">
                {filteredActivityLogs.map((log) => {
                  const isCritical = log.severity === 'critical';
                  const isWarning = log.severity === 'warning';
                  const isAuth = log.category === 'auth' || log.action.includes('LOGIN') || log.action.includes('AUTH');
                  const isPayment = log.category === 'payment_failure' || log.action.includes('PAYMENT');
                  const isAccount = log.category === 'account_management' || log.action.includes('STATUS') || log.action.includes('CUSTOMER');

                  return (
                    <div
                      key={log.id}
                      className={`p-4 hover:bg-neutral-50/90 transition-colors flex flex-col md:flex-row items-start md:items-center justify-between gap-3 ${
                        isCritical ? 'bg-red-50/30' : isWarning ? 'bg-amber-50/20' : ''
                      }`}
                    >
                      <div className="space-y-1.5 flex-1 min-w-0">
                        {/* Event Tags & Severity */}
                        <div className="flex flex-wrap items-center gap-2">
                          {/* Severity Badge */}
                          {isCritical ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-red-100 text-red-800 text-[10px] font-black uppercase tracking-wider font-mono border border-red-200">
                              <AlertOctagon className="w-3 h-3 text-red-600" />
                              <span>CRITICAL</span>
                            </span>
                          ) : isWarning ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-100 text-amber-800 text-[10px] font-black uppercase tracking-wider font-mono border border-amber-200">
                              <AlertTriangle className="w-3 h-3 text-amber-600" />
                              <span>WARNING</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 text-[10px] font-bold uppercase tracking-wider font-mono border border-emerald-200">
                              <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                              <span>INFO</span>
                            </span>
                          )}

                          {/* Category Badge */}
                          {isAuth ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 text-[10px] font-bold border border-blue-200">
                              <KeyRound className="w-3 h-3" />
                              <span>User Auth</span>
                            </span>
                          ) : isPayment ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-rose-50 text-rose-700 text-[10px] font-bold border border-rose-200">
                              <CreditCard className="w-3 h-3" />
                              <span>Payment Gateway</span>
                            </span>
                          ) : isAccount ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-orange-50 text-orange-700 text-[10px] font-bold border border-orange-200">
                              <UserCheck className="w-3 h-3" />
                              <span>Account Governance</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-neutral-100 text-neutral-700 text-[10px] font-bold border border-neutral-200">
                              <span>System</span>
                            </span>
                          )}

                          {/* Action Code */}
                          <span className="font-mono text-[11px] font-bold text-neutral-900 bg-neutral-100 px-2 py-0.5 rounded border border-neutral-200">
                            {log.action}
                          </span>

                          {/* Actor */}
                          <span className="font-semibold text-neutral-800 flex items-center gap-1">
                            <span>by</span>
                            <span className="font-bold underline decoration-neutral-300">{log.actor}</span>
                            <span className="text-[10px] text-neutral-400 font-mono">({log.role})</span>
                          </span>

                          {/* IP Address */}
                          {log.ipAddress && (
                            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-neutral-100 text-neutral-500 font-mono text-[10px]">
                              <Globe className="w-3 h-3 text-neutral-400" />
                              <span>{log.ipAddress}</span>
                            </span>
                          )}
                        </div>

                        {/* Audit Details Description */}
                        <p className="text-neutral-700 font-medium leading-relaxed pl-0.5">
                          {log.details}
                        </p>

                        {/* Target Context */}
                        <div className="flex items-center gap-3 text-[10px] text-neutral-400 font-mono">
                          <span>Target: <strong className="text-neutral-600">{log.targetType}</strong> ({log.targetId})</span>
                          <span>·</span>
                          <span>Log ID: {log.id}</span>
                        </div>
                      </div>

                      {/* Timestamp */}
                      <div className="text-right shrink-0 self-start md:self-center font-mono">
                        <span className="text-xs font-bold text-neutral-900 block">
                          {new Date(log.timestamp).toLocaleTimeString('en-ZA', {
                            hour: '2-digit',
                            minute: '2-digit',
                            second: '2-digit',
                          })}
                        </span>
                        <span className="text-[10px] text-neutral-400 block">
                          {new Date(log.timestamp).toLocaleDateString('en-ZA', {
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric',
                          })}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
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
            <span className="text-xs font-semibold px-2.5 py-1 bg-orange-50 text-orange-700 rounded-lg border border-orange-200">
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
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-orange-50 text-orange-700 border border-orange-200 flex items-center gap-1 font-mono">
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

      {/* TAB: COUPON GENERATOR & PROMOTIONAL VOUCHERS (EXCLUSIVE FOR ADMINS) */}
      {activeTab === 'coupons' && (
        <div className="space-y-6 animate-in fade-in">
          {couponSuccessMessage && (
            <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs flex items-center justify-between gap-3 shadow-xs">
              <div className="flex items-center gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span className="font-bold">{couponSuccessMessage}</span>
              </div>
              <button
                type="button"
                onClick={() => setCouponSuccessMessage(null)}
                className="text-emerald-700 hover:text-emerald-900 text-xs font-bold"
              >
                Dismiss
              </button>
            </div>
          )}

          {/* Header Stats */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            <div className="bg-white p-4 rounded-xl border border-neutral-200 shadow-sm">
              <span className="text-xs font-semibold text-neutral-500">Total Coupons</span>
              <p className="text-2xl font-black text-neutral-900 mt-1 font-mono">{coupons.length}</p>
              <span className="text-[11px] text-neutral-400">Registered storewide</span>
            </div>

            <div className="bg-white p-4 rounded-xl border border-neutral-200 shadow-sm">
              <span className="text-xs font-semibold text-emerald-600">Active Coupons</span>
              <p className="text-2xl font-black text-emerald-700 mt-1 font-mono">
                {coupons.filter((c) => c.isActive).length}
              </p>
              <span className="text-[11px] text-emerald-600">Live in Cart &amp; Checkout</span>
            </div>

            <div className="bg-white p-4 rounded-xl border border-neutral-200 shadow-sm">
              <span className="text-xs font-semibold text-orange-600">Percentage Discs</span>
              <p className="text-2xl font-black text-orange-600 mt-1 font-mono">
                {coupons.filter((c) => c.type === 'PERCENTAGE').length}
              </p>
              <span className="text-[11px] text-orange-600">Rate-based incentives</span>
            </div>

            <div className="bg-white p-4 rounded-xl border border-neutral-200 shadow-sm">
              <span className="text-xs font-semibold text-amber-600">Fixed Rand Discs</span>
              <p className="text-2xl font-black text-amber-700 mt-1 font-mono">
                {coupons.filter((c) => c.type === 'FIXED_CENTS').length}
              </p>
              <span className="text-[11px] text-amber-600">ZAR direct deductions</span>
            </div>
          </div>

          {/* Coupon Generator Card */}
          <div className="bg-white rounded-2xl border border-neutral-200 shadow-sm p-5 sm:p-6 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-neutral-100">
              <div>
                <h3 className="text-sm font-black text-neutral-900 uppercase tracking-wider flex items-center gap-2">
                  <Tag className="w-4 h-4 text-orange-600" />
                  <span>Admin Coupon Generator</span>
                </h3>
                <p className="text-xs text-neutral-500 mt-0.5">
                  Generate bespoke or automated discount codes for promotional campaigns, marketing affiliates, and VIP customer service.
                </p>
              </div>

              {/* Fast Presets */}
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider mr-1">
                  Quick Presets:
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setNewCouponCode('MEVO-10PCT');
                    setNewCouponType('PERCENTAGE');
                    setNewCouponValue(10);
                    setNewCouponMinOrderZAR(1000);
                    setNewCouponDescription('10% off storewide orders over R1,000.00');
                  }}
                  className="px-2 py-1 rounded bg-neutral-100 hover:bg-orange-50 hover:text-orange-700 text-neutral-700 text-[10px] font-bold transition-colors cursor-pointer border border-neutral-200"
                >
                  10% (Min R1k)
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setNewCouponCode('MEVO-R150');
                    setNewCouponType('FIXED_CENTS');
                    setNewCouponValue(150);
                    setNewCouponMinOrderZAR(1500);
                    setNewCouponDescription('R150 off orders over R1,500.00');
                  }}
                  className="px-2 py-1 rounded bg-neutral-100 hover:bg-orange-50 hover:text-orange-700 text-neutral-700 text-[10px] font-bold transition-colors cursor-pointer border border-neutral-200"
                >
                  R150 Off (Min R1.5k)
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setNewCouponCode('MEVO-R250');
                    setNewCouponType('FIXED_CENTS');
                    setNewCouponValue(250);
                    setNewCouponMinOrderZAR(2000);
                    setNewCouponDescription('R250 off orders over R2,000.00');
                  }}
                  className="px-2 py-1 rounded bg-neutral-100 hover:bg-orange-50 hover:text-orange-700 text-neutral-700 text-[10px] font-bold transition-colors cursor-pointer border border-neutral-200"
                >
                  R250 Off (Min R2k)
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setNewCouponCode('MEVO-VIP20');
                    setNewCouponType('PERCENTAGE');
                    setNewCouponValue(20);
                    setNewCouponMinOrderZAR(3000);
                    setNewCouponDescription('20% VIP hardware workstation deal (Min R3,000)');
                  }}
                  className="px-2 py-1 rounded bg-neutral-100 hover:bg-orange-50 hover:text-orange-700 text-neutral-700 text-[10px] font-bold transition-colors cursor-pointer border border-neutral-200"
                >
                  20% VIP (Min R3k)
                </button>
              </div>
            </div>

            {/* Form */}
            <form onSubmit={handleCreateCoupon} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* 1. Code Input & Randomizer */}
                <div>
                  <label className="block text-[11px] font-bold text-neutral-700 uppercase tracking-wider mb-1">
                    Coupon Code
                  </label>
                  <div className="flex gap-1.5">
                    <input
                      type="text"
                      placeholder="e.g. MEVO-SAVE15"
                      value={newCouponCode}
                      onChange={(e) => setNewCouponCode(e.target.value.toUpperCase())}
                      className="w-full px-3 py-2 bg-neutral-50 border border-neutral-300 rounded-lg text-xs font-mono font-bold uppercase focus:bg-white focus:outline-none focus:ring-2 focus:ring-orange-500"
                    />
                    <button
                      type="button"
                      onClick={handleRandomizeCode}
                      className="px-2.5 py-2 rounded-lg bg-neutral-100 hover:bg-neutral-200 text-neutral-700 border border-neutral-300 text-xs font-bold transition-colors cursor-pointer shrink-0"
                      title="Generate random branded code"
                    >
                      <Zap className="w-3.5 h-3.5 text-orange-600" />
                    </button>
                  </div>
                  <span className="text-[10px] text-neutral-400 mt-1 block">
                    Leave blank to auto-generate
                  </span>
                </div>

                {/* 2. Discount Type */}
                <div>
                  <label className="block text-[11px] font-bold text-neutral-700 uppercase tracking-wider mb-1">
                    Discount Type
                  </label>
                  <select
                    value={newCouponType}
                    onChange={(e) => setNewCouponType(e.target.value as any)}
                    className="w-full px-3 py-2 bg-neutral-50 border border-neutral-300 rounded-lg text-xs font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-orange-500"
                  >
                    <option value="PERCENTAGE">Percentage (%) Off Subtotal</option>
                    <option value="FIXED_CENTS">Fixed Amount (Rands) Off</option>
                  </select>
                  <span className="text-[10px] text-neutral-400 mt-1 block">
                    {newCouponType === 'PERCENTAGE' ? 'Proportional order reduction' : 'Lump-sum Rand deduction'}
                  </span>
                </div>

                {/* 3. Discount Value */}
                <div>
                  <label className="block text-[11px] font-bold text-neutral-700 uppercase tracking-wider mb-1">
                    {newCouponType === 'PERCENTAGE' ? 'Discount Rate (%)' : 'Discount Amount (Rands)'}
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      min="1"
                      max={newCouponType === 'PERCENTAGE' ? 90 : 50000}
                      step={newCouponType === 'PERCENTAGE' ? '1' : '10'}
                      value={newCouponValue}
                      onChange={(e) => setNewCouponValue(Number(e.target.value))}
                      required
                      className="w-full px-3 py-2 bg-neutral-50 border border-neutral-300 rounded-lg text-xs font-mono font-bold focus:bg-white focus:outline-none focus:ring-2 focus:ring-orange-500"
                    />
                    <span className="absolute right-3 top-2.5 text-xs font-bold text-neutral-400">
                      {newCouponType === 'PERCENTAGE' ? '%' : 'ZAR'}
                    </span>
                  </div>
                  <span className="text-[10px] text-neutral-400 mt-1 block">
                    {newCouponType === 'PERCENTAGE' ? `${newCouponValue}% off checkout` : `R ${newCouponValue}.00 off checkout`}
                  </span>
                </div>

                {/* 4. Minimum Order Threshold */}
                <div>
                  <label className="block text-[11px] font-bold text-neutral-700 uppercase tracking-wider mb-1">
                    Min Order Spend (ZAR)
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      min="0"
                      step="50"
                      value={newCouponMinOrderZAR}
                      onChange={(e) => setNewCouponMinOrderZAR(Number(e.target.value))}
                      required
                      className="w-full px-3 py-2 bg-neutral-50 border border-neutral-300 rounded-lg text-xs font-mono font-bold focus:bg-white focus:outline-none focus:ring-2 focus:ring-orange-500"
                    />
                    <span className="absolute right-3 top-2.5 text-xs font-bold text-neutral-400">
                      ZAR
                    </span>
                  </div>
                  <span className="text-[10px] text-neutral-400 mt-1 block">
                    Must spend R {newCouponMinOrderZAR}.00+
                  </span>
                </div>
              </div>

              {/* Description & Action */}
              <div className="flex flex-col sm:flex-row sm:items-end gap-3 pt-2">
                <div className="flex-1">
                  <label className="block text-[11px] font-bold text-neutral-700 uppercase tracking-wider mb-1">
                    Campaign Description &amp; Customer Note
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Exclusive Sandton VIP spring hardware promotion"
                    value={newCouponDescription}
                    onChange={(e) => setNewCouponDescription(e.target.value)}
                    className="w-full px-3 py-2 bg-neutral-50 border border-neutral-300 rounded-lg text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-orange-500"
                  />
                </div>

                <button
                  type="submit"
                  disabled={isGeneratingCoupon}
                  className="py-2.5 px-6 rounded-xl bg-orange-600 hover:bg-orange-500 text-white font-bold text-xs uppercase tracking-wider transition-all shadow-md hover:shadow-orange-500/25 cursor-pointer shrink-0 flex items-center gap-2"
                >
                  <Plus className="w-4 h-4" />
                  <span>{isGeneratingCoupon ? 'Generating...' : 'Create & Activate Coupon'}</span>
                </button>
              </div>
            </form>
          </div>

          {/* Existing Coupons Table & Management */}
          <div className="bg-white rounded-2xl border border-neutral-200 shadow-sm overflow-hidden">
            <div className="p-4 sm:p-5 border-b border-neutral-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h4 className="text-xs font-black text-neutral-900 uppercase tracking-wider">
                  Storewide Coupons &amp; Promotional Codes
                </h4>
                <p className="text-[11px] text-neutral-500 mt-0.5">
                  Live coupons registered in the engine. Users can enter these codes at CartDrawer and CheckoutModal.
                </p>
              </div>

              {/* Search Bar */}
              <div className="relative w-full sm:w-64">
                <Search className="w-3.5 h-3.5 text-neutral-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  placeholder="Filter coupons..."
                  value={couponSearch}
                  onChange={(e) => setCouponSearch(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 text-xs bg-neutral-50 border border-neutral-300 rounded-lg focus:bg-white focus:outline-none focus:ring-2 focus:ring-orange-500"
                />
              </div>
            </div>

            {/* Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-neutral-50 border-b border-neutral-200 text-neutral-500 font-semibold uppercase text-[10px] tracking-wider">
                  <tr>
                    <th className="py-3 px-4">Coupon Code</th>
                    <th className="py-3 px-4">Discount</th>
                    <th className="py-3 px-4">Min Order</th>
                    <th className="py-3 px-4">Campaign Description</th>
                    <th className="py-3 px-4 text-center">Status</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100">
                  {coupons
                    .filter(
                      (c) =>
                        !couponSearch.trim() ||
                        c.code.toLowerCase().includes(couponSearch.toLowerCase()) ||
                        c.description.toLowerCase().includes(couponSearch.toLowerCase())
                    )
                    .map((coupon) => (
                      <tr key={coupon.code} className="hover:bg-neutral-50/70 transition-colors">
                        <td className="py-3 px-4 font-mono font-bold text-neutral-900">
                          <div className="flex items-center gap-2">
                            <span className="px-2 py-0.5 rounded bg-neutral-100 border border-neutral-300 text-neutral-900 text-xs font-mono font-extrabold tracking-wider">
                              {coupon.code}
                            </span>
                            <button
                              type="button"
                              onClick={() => handleCopyCoupon(coupon.code)}
                              className="text-neutral-400 hover:text-orange-600 transition-colors p-1"
                              title="Copy code"
                            >
                              {copiedCouponCode === coupon.code ? (
                                <Check className="w-3.5 h-3.5 text-emerald-600" />
                              ) : (
                                <Copy className="w-3.5 h-3.5" />
                              )}
                            </button>
                          </div>
                        </td>

                        <td className="py-3 px-4 font-mono font-black text-emerald-700">
                          {coupon.type === 'PERCENTAGE'
                            ? `${coupon.value}% OFF`
                            : `-${formatZAR(coupon.value)}`}
                        </td>

                        <td className="py-3 px-4 font-mono text-neutral-700">
                          {coupon.minOrderCents > 0 ? formatZAR(coupon.minOrderCents) : 'None (R0)'}
                        </td>

                        <td className="py-3 px-4 text-neutral-600 max-w-xs truncate">
                          {coupon.description}
                        </td>

                        <td className="py-3 px-4 text-center">
                          <span
                            className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${
                              coupon.isActive
                                ? 'bg-emerald-50 text-emerald-700 border-emerald-300'
                                : 'bg-neutral-100 text-neutral-500 border-neutral-300'
                            }`}
                          >
                            {coupon.isActive ? 'Active' : 'Inactive'}
                          </span>
                        </td>

                        <td className="py-3 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              type="button"
                              onClick={() => handleToggleCoupon(coupon.code)}
                              className={`px-2.5 py-1 rounded text-xs font-semibold transition-colors cursor-pointer border ${
                                coupon.isActive
                                  ? 'bg-neutral-100 hover:bg-neutral-200 text-neutral-700 border-neutral-300'
                                  : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border-emerald-300'
                              }`}
                            >
                              {coupon.isActive ? 'Deactivate' : 'Activate'}
                            </button>

                            <button
                              type="button"
                              onClick={() => handleDeleteCoupon(coupon.code)}
                              className="p-1 text-neutral-400 hover:text-rose-600 transition-colors rounded hover:bg-rose-50 cursor-pointer"
                              title={`Delete ${coupon.code}`}
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}

                  {coupons.length === 0 && (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-neutral-400 text-xs">
                        No promotional discount coupons registered. Use the generator above to create one.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 7: CUSTOMER ACCOUNTS DIRECTORY & ACCESS CONTROL */}
      {activeTab === 'customers' && (
        <div className="space-y-6">
          {statusSuccessMessage && (
            <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs flex items-center gap-2.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span className="font-semibold">{statusSuccessMessage}</span>
            </div>
          )}

          {/* Customers Overview Header */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            <div className="bg-white p-4 rounded-xl border border-neutral-200 shadow-sm">
              <span className="text-xs font-semibold text-neutral-500">Total Accounts</span>
              <p className="text-2xl font-black text-neutral-900 mt-1">{customers.length}</p>
              <span className="text-[11px] text-neutral-400">Registered Customers</span>
            </div>

            <div className="bg-white p-4 rounded-xl border border-neutral-200 shadow-sm">
              <span className="text-xs font-semibold text-emerald-600">Active Accounts</span>
              <p className="text-2xl font-black text-emerald-700 mt-1">
                {customers.filter((c) => c.status === 'active' || !c.status).length}
              </p>
              <span className="text-[11px] text-emerald-600">Full Purchasing Access</span>
            </div>

            <div className="bg-white p-4 rounded-xl border border-neutral-200 shadow-sm">
              <span className="text-xs font-semibold text-amber-600">Restricted Accounts</span>
              <p className="text-2xl font-black text-amber-700 mt-1">
                {customers.filter((c) => c.status === 'restricted').length}
              </p>
              <span className="text-[11px] text-amber-600">Checkout Suspended</span>
            </div>

            <div className="bg-white p-4 rounded-xl border border-neutral-200 shadow-sm">
              <span className="text-xs font-semibold text-rose-600">Blocked / Banned</span>
              <p className="text-2xl font-black text-rose-700 mt-1">
                {customers.filter((c) => c.status === 'blocked').length}
              </p>
              <span className="text-[11px] text-rose-600">Login Disabled</span>
            </div>
          </div>

          {/* Customer Search & Filter Bar */}
          <div className="bg-white p-4 rounded-xl border border-neutral-200 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="relative w-full sm:w-80">
              <Search className="w-4 h-4 text-neutral-400 absolute left-3 top-2.5 pointer-events-none" />
              <input
                type="text"
                value={customerSearch}
                onChange={(e) => setCustomerSearch(e.target.value)}
                placeholder="Search customers by name, email, phone..."
                className="w-full pl-9 pr-3 py-2 bg-neutral-50 border border-neutral-300 rounded-lg text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-orange-500"
              />
            </div>

            <div className="flex items-center gap-2 self-stretch sm:self-auto overflow-x-auto text-xs font-semibold">
              <span className="text-neutral-500">Status:</span>
              {(['all', 'active', 'restricted', 'blocked'] as const).map((st) => (
                <button
                  key={st}
                  onClick={() => setCustomerStatusFilter(st)}
                  className={`px-3 py-1.5 rounded-lg capitalize transition-colors cursor-pointer shrink-0 ${
                    customerStatusFilter === st
                      ? 'bg-neutral-900 text-white'
                      : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'
                  }`}
                >
                  {st}
                </button>
              ))}
            </div>
          </div>

          {/* Customer Directory Table */}
          <div className="bg-white rounded-xl border border-neutral-200 overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-neutral-50 border-b border-neutral-200 text-neutral-500 uppercase tracking-wider font-bold text-[10px]">
                    <th className="py-3 px-4">Customer Details</th>
                    <th className="py-3 px-4">Single Sign-On</th>
                    <th className="py-3 px-4">Account Status</th>
                    <th className="py-3 px-4">Orders &amp; Value</th>
                    <th className="py-3 px-4">Activity Date</th>
                    <th className="py-3 px-4 text-right">Access Controls</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100 font-medium">
                  {filteredCustomers.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-neutral-400">
                        No customer accounts match your search or filter.
                      </td>
                    </tr>
                  ) : (
                    filteredCustomers.map((cust) => {
                      const isGoogle = cust.authProvider === 'google';
                      const isFacebook = cust.authProvider === 'facebook';
                      const status = cust.status || 'active';

                      return (
                        <tr key={cust.id} className="hover:bg-neutral-50/70 transition-colors">
                          <td className="py-3.5 px-4">
                            <div className="flex items-center gap-3">
                              {cust.avatar ? (
                                <img
                                  src={cust.avatar}
                                  alt={cust.name}
                                  className="w-9 h-9 rounded-full object-cover border border-neutral-200 shrink-0"
                                />
                              ) : (
                                <div className="w-9 h-9 rounded-full bg-orange-100 text-orange-700 flex items-center justify-center font-bold text-xs shrink-0">
                                  {cust.name.substring(0, 2).toUpperCase()}
                                </div>
                              )}
                              <div>
                                <p className="font-bold text-neutral-900">{cust.name}</p>
                                <p className="text-neutral-500 font-mono text-[11px]">{cust.email}</p>
                                <p className="text-neutral-400 text-[10px]">{cust.phone}</p>
                              </div>
                            </div>
                          </td>

                          <td className="py-3.5 px-4">
                            {isGoogle ? (
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-blue-50 text-blue-700 font-bold text-[11px] border border-blue-200/60">
                                <svg className="w-3.5 h-3.5" viewBox="0 0 24 24">
                                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                                </svg>
                                <span>Google / Gmail</span>
                              </span>
                            ) : isFacebook ? (
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-[#1877F2]/10 text-[#1877F2] font-bold text-[11px] border border-[#1877F2]/20">
                                <span>Facebook</span>
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-neutral-100 text-neutral-700 font-bold text-[11px]">
                                <span>Email / Password</span>
                              </span>
                            )}
                          </td>

                          <td className="py-3.5 px-4">
                            <div>
                              {status === 'active' ? (
                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 font-bold text-[11px]">
                                  <UserCheck className="w-3 h-3" />
                                  <span>Active · Full Access</span>
                                </span>
                              ) : status === 'restricted' ? (
                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-100 text-amber-800 font-bold text-[11px]">
                                  <ShieldAlert className="w-3 h-3" />
                                  <span>Restricted · No Checkout</span>
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-rose-100 text-rose-800 font-bold text-[11px]">
                                  <Ban className="w-3 h-3" />
                                  <span>Blocked · Banned</span>
                                </span>
                              )}

                              {cust.restrictionReason && status !== 'active' && (
                                <p className="text-[10px] text-neutral-500 mt-1 max-w-xs truncate" title={cust.restrictionReason}>
                                  Reason: {cust.restrictionReason}
                                </p>
                              )}
                            </div>
                          </td>

                          <td className="py-3.5 px-4 font-mono">
                            <p className="font-bold text-neutral-900">{formatZAR(cust.totalSpendCents || 0)}</p>
                            <p className="text-neutral-500 text-[11px]">{cust.orderCount || 0} lifetime orders</p>
                          </td>

                          <td className="py-3.5 px-4 text-[11px] text-neutral-500">
                            <p>Joined: {new Date(cust.createdAt).toLocaleDateString('en-ZA')}</p>
                            {cust.lastLoginAt && (
                              <p className="text-[10px] text-neutral-400">
                                Last seen: {new Date(cust.lastLoginAt).toLocaleDateString('en-ZA')}
                              </p>
                            )}
                          </td>

                          <td className="py-3.5 px-4 text-right">
                            <button
                              onClick={() => {
                                setSelectedCustomerForStatus(cust);
                                setNewStatusSelection(cust.status || 'active');
                                setStatusChangeReason(cust.restrictionReason || '');
                              }}
                              className="px-3 py-1.5 bg-neutral-900 hover:bg-orange-600 text-white rounded-lg text-xs font-bold transition-colors cursor-pointer"
                            >
                              Manage Access
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 8: PRODUCT PLACEMENT & STORE MERCHANDISING */}
      {activeTab === 'merchandising' && (
        <div className="space-y-6">
          {placementSuccess && (
            <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs flex items-center gap-2.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span className="font-semibold">{placementSuccess}</span>
            </div>
          )}

          {/* Merchandising Zones Explanation Header */}
          <div className="bg-white p-6 rounded-xl border border-neutral-200 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-bold text-neutral-900 uppercase tracking-wider">
                  Storefront Merchandising &amp; Product Placement Engine
                </h3>
                <p className="text-xs text-neutral-500 mt-1">
                  Control exact product placement across high-converting zones on the MEVO TECH storefront.
                </p>
              </div>
              <span className="text-xs font-semibold px-2.5 py-1 bg-orange-50 text-orange-700 rounded-lg border border-orange-200">
                4 Active Placement Zones
              </span>
            </div>

            {/* Placement Control Form */}
            <form onSubmit={handleSaveProductPlacement} className="p-4 bg-neutral-50 rounded-xl border border-neutral-200 grid grid-cols-1 sm:grid-cols-4 gap-4 text-xs items-end">
              <div>
                <label className="block font-bold text-neutral-700 mb-1">Select Product</label>
                <select
                  value={selectedProductForPlacement}
                  onChange={(e) => setSelectedProductForPlacement(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-neutral-300 rounded-lg font-medium focus:ring-2 focus:ring-orange-500"
                >
                  {products.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({formatZAR(p.promotionalPriceCents || p.priceCents)})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-bold text-neutral-700 mb-1">Target Placement Zone</label>
                <select
                  value={placementSlotSelection}
                  onChange={(e) => setPlacementSlotSelection(e.target.value as any)}
                  className="w-full px-3 py-2 bg-white border border-neutral-300 rounded-lg font-medium focus:ring-2 focus:ring-orange-500"
                >
                  <option value="hero_spotlight">Hero Carousel Spotlight (Top Banner)</option>
                  <option value="deals_of_the_day">Deals of the Day (Flash Showcase)</option>
                  <option value="trending_now">Trending Right Now (High Velocity Ribbon)</option>
                  <option value="category_lead">Category Lead (Pinned to Category Top)</option>
                  <option value="standard">Standard Catalog Feed</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-neutral-700 mb-1">Priority Rank (1 = Top)</label>
                <input
                  type="number"
                  min="1"
                  max="10"
                  value={placementPriorityInput}
                  onChange={(e) => setPlacementPriorityInput(Number(e.target.value))}
                  className="w-full px-3 py-2 bg-white border border-neutral-300 rounded-lg font-medium focus:ring-2 focus:ring-orange-500"
                />
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="submit"
                  disabled={isSavingPlacement}
                  className="w-full py-2 bg-orange-600 hover:bg-orange-700 text-white font-bold rounded-lg shadow-sm transition-colors cursor-pointer disabled:opacity-50"
                >
                  {isSavingPlacement ? 'Updating...' : 'Assign Placement'}
                </button>
              </div>
            </form>
          </div>

          {/* Filter by Zone */}
          <div className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-2 overflow-x-auto">
              <span className="font-bold text-neutral-700">Filter Zone:</span>
              {(['all', 'hero_spotlight', 'deals_of_the_day', 'trending_now', 'category_lead', 'standard'] as const).map(
                (slot) => (
                  <button
                    key={slot}
                    onClick={() => setPlacementSlotFilter(slot)}
                    className={`px-3 py-1.5 rounded-lg font-semibold transition-colors cursor-pointer shrink-0 ${
                      placementSlotFilter === slot
                        ? 'bg-orange-600 text-white shadow-xs'
                        : 'bg-white border border-neutral-200 text-neutral-600 hover:bg-neutral-50'
                    }`}
                  >
                    {slot.replace(/_/g, ' ').toUpperCase()}
                  </button>
                )
              )}
            </div>
            <span className="text-neutral-500">{filteredPlacementProducts.length} items</span>
          </div>

          {/* Current Placement Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {filteredPlacementProducts.map((p) => {
              const currentSlot = p.placementSlot || 'standard';
              return (
                <div key={p.id} className="bg-white p-4 rounded-xl border border-neutral-200 shadow-sm flex flex-col justify-between space-y-3">
                  <div className="flex items-start gap-3">
                    <img
                      src={p.primaryImage}
                      alt={p.name}
                      className="w-16 h-16 object-cover rounded-lg bg-neutral-100 shrink-0"
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5 mb-1">
                        <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded ${
                          currentSlot === 'hero_spotlight'
                            ? 'bg-orange-100 text-orange-800'
                            : currentSlot === 'deals_of_the_day'
                            ? 'bg-amber-100 text-amber-800'
                            : currentSlot === 'trending_now'
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-neutral-100 text-neutral-600'
                        }`}>
                          {currentSlot.replace(/_/g, ' ')}
                        </span>
                        {p.placementPriority && (
                          <span className="text-[10px] font-bold text-neutral-500">
                            #{p.placementPriority}
                          </span>
                        )}
                      </div>
                      <h4 className="font-bold text-xs text-neutral-900 truncate">{p.name}</h4>
                      <p className="text-neutral-500 text-[11px] font-mono">{formatZAR(p.promotionalPriceCents || p.priceCents)}</p>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-neutral-100 flex items-center justify-between text-[11px]">
                    <span className="text-neutral-400">Stock: {p.onHandQuantity - p.reservedQuantity} left</span>
                    <button
                      onClick={() => {
                        setSelectedProductForPlacement(p.id);
                        setPlacementSlotSelection(currentSlot);
                        setPlacementPriorityInput(p.placementPriority || 1);
                        window.scrollTo({ top: 400, behavior: 'smooth' });
                      }}
                      className="text-orange-600 font-bold hover:underline cursor-pointer"
                    >
                      Change Zone
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* CUSTOMER ACCESS MANAGEMENT MODAL */}
      {selectedCustomerForStatus && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-neutral-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-neutral-200 space-y-4 text-xs">
            <div className="flex items-center justify-between pb-3 border-b border-neutral-200">
              <div className="flex items-center gap-2">
                <ShieldAlert className="w-5 h-5 text-orange-600" />
                <h3 className="font-bold text-sm text-neutral-900">Manage Customer Policy &amp; Access</h3>
              </div>
              <button
                onClick={() => setSelectedCustomerForStatus(null)}
                className="p-1 rounded-lg hover:bg-neutral-100 text-neutral-400 hover:text-neutral-600 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-3 bg-neutral-50 rounded-xl space-y-1">
              <p className="font-bold text-neutral-900">{selectedCustomerForStatus.name}</p>
              <p className="text-neutral-500 font-mono">{selectedCustomerForStatus.email}</p>
              <p className="text-neutral-400 text-[11px]">
                Current Status:{' '}
                <strong className="text-neutral-800 uppercase">
                  {selectedCustomerForStatus.status || 'ACTIVE'}
                </strong>
              </p>
            </div>

            <form onSubmit={handleUpdateCustomerStatus} className="space-y-4">
              <div>
                <label className="block font-bold text-neutral-700 mb-2">New Access Status</label>
                <div className="space-y-2">
                  <label className="flex items-center gap-2.5 p-2.5 rounded-xl border border-neutral-200 hover:bg-neutral-50 cursor-pointer">
                    <input
                      type="radio"
                      name="accountStatus"
                      value="active"
                      checked={newStatusSelection === 'active'}
                      onChange={() => setNewStatusSelection('active')}
                      className="text-orange-600"
                    />
                    <div>
                      <span className="font-bold text-emerald-700">Active (Full Access)</span>
                      <p className="text-[11px] text-neutral-500">Customer can log in, browse, and place new orders normally.</p>
                    </div>
                  </label>

                  <label className="flex items-center gap-2.5 p-2.5 rounded-xl border border-neutral-200 hover:bg-neutral-50 cursor-pointer">
                    <input
                      type="radio"
                      name="accountStatus"
                      value="restricted"
                      checked={newStatusSelection === 'restricted'}
                      onChange={() => setNewStatusSelection('restricted')}
                      className="text-amber-600"
                    />
                    <div>
                      <span className="font-bold text-amber-700">Restricted (Checkout Blocked)</span>
                      <p className="text-[11px] text-neutral-500">Customer can log in and browse, but checkout and orders are blocked.</p>
                    </div>
                  </label>

                  <label className="flex items-center gap-2.5 p-2.5 rounded-xl border border-neutral-200 hover:bg-neutral-50 cursor-pointer">
                    <input
                      type="radio"
                      name="accountStatus"
                      value="blocked"
                      checked={newStatusSelection === 'blocked'}
                      onChange={() => setNewStatusSelection('blocked')}
                      className="text-rose-600"
                    />
                    <div>
                      <span className="font-bold text-rose-700">Blocked / Banned (Login Suspended)</span>
                      <p className="text-[11px] text-neutral-500">Customer login is rejected and all platform sessions are terminated.</p>
                    </div>
                  </label>
                </div>
              </div>

              <div>
                <label className="block font-bold text-neutral-700 mb-1">
                  Reason for Action (Recorded in Audit Log)
                </label>
                <textarea
                  rows={2}
                  required={newStatusSelection !== 'active'}
                  value={statusChangeReason}
                  onChange={(e) => setStatusChangeReason(e.target.value)}
                  placeholder="e.g. Chargeback investigation, suspicious activity, or unblocked after ID verification"
                  className="w-full px-3 py-2 bg-neutral-50 border border-neutral-300 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-orange-500 font-medium"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedCustomerForStatus(null)}
                  className="px-4 py-2 bg-neutral-100 hover:bg-neutral-200 text-neutral-700 font-bold rounded-xl cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isUpdatingStatus}
                  className="px-5 py-2 bg-orange-600 hover:bg-orange-700 text-white font-bold rounded-xl shadow-sm transition-colors cursor-pointer disabled:opacity-50"
                >
                  {isUpdatingStatus ? 'Enforcing Policy...' : 'Apply Status Change'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
        </div>
      </main>
    </div>
  );
};

