import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import { api } from '../services/api';
import { Order, Product, ProductReview, ShippingAddress, PriceAlert } from '../types';
import { formatZAR } from '../utils/calculations';
import { ReviewModal } from './ReviewModal';
import { ShareModal } from './ShareModal';
import {
  User,
  Package,
  Truck,
  Heart,
  Settings,
  LogOut,
  Clock,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  ShoppingBag,
  Star,
  Share2,
  CreditCard,
  FileText,
  MapPin,
  ChevronRight,
  ShieldCheck,
  RefreshCw,
  Sparkles,
  Download,
  Trash2,
  Lock,
  ShieldAlert,
  Bell,
  TrendingDown,
  Mail,
  Bookmark,
} from 'lucide-react';

interface CustomerDashboardProps {
  allProducts: Product[];
  onSelectProduct: (product: Product) => void;
  onBackToStore: () => void;
  onProceedToPayOrder?: (order: Order) => void;
  initialTab?: 'overview' | 'orders' | 'bought' | 'favourites' | 'profile' | 'saved_carts';
}

export const CustomerDashboard: React.FC<CustomerDashboardProps> = ({
  allProducts,
  onSelectProduct,
  onBackToStore,
  onProceedToPayOrder,
  initialTab = 'overview',
}) => {
  const { customer, customerLogout, updateCustomerProfile, openAuthModal } = useAuth();
  const {
    addItem,
    wishlist,
    toggleWishlist,
    abandonedCarts,
    isLoadingAbandonedCarts,
    refreshAbandonedCarts,
    restoreAbandonedCart,
    emailAbandonedCartReminder,
    dismissAbandonedCart,
  } = useCart();

  const [activeTab, setActiveTab] = useState<'overview' | 'orders' | 'bought' | 'favourites' | 'profile' | 'alerts' | 'saved_carts'>(initialTab);
  const [cartActionNotice, setCartActionNotice] = useState<{
    type: 'success' | 'error';
    message: string;
  } | null>(null);
  const [busyCartId, setBusyCartId] = useState<string | null>(null);

  useEffect(() => {
    setActiveTab(initialTab);
  }, [initialTab]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoadingOrders, setIsLoadingOrders] = useState(false);
  const [priceAlerts, setPriceAlerts] = useState<PriceAlert[]>([]);
  const [isLoadingAlerts, setIsLoadingAlerts] = useState(false);
  const [selectedOrderForTracking, setSelectedOrderForTracking] = useState<Order | null>(null);
  const [selectedInvoiceOrder, setSelectedInvoiceOrder] = useState<Order | null>(null);

  // Review modal state
  const [reviewProduct, setReviewProduct] = useState<Product | null>(null);
  const [shareProduct, setShareProduct] = useState<Product | null>(null);

  // Profile Edit Form State
  const [profileName, setProfileName] = useState(customer?.name || '');
  const [profilePhone, setProfilePhone] = useState(customer?.phone || '');
  const [profileStreet, setProfileStreet] = useState(customer?.defaultAddress?.streetAddress || '');
  const [profileSuburb, setProfileSuburb] = useState(customer?.defaultAddress?.suburb || '');
  const [profileCity, setProfileCity] = useState(customer?.defaultAddress?.city || 'Johannesburg');
  const [profileProvince, setProfileProvince] = useState(customer?.defaultAddress?.province || 'Gauteng');
  const [profilePostal, setProfilePostal] = useState(customer?.defaultAddress?.postalCode || '2196');
  const [profileNotes, setProfileNotes] = useState(customer?.defaultAddress?.deliveryNotes || '');
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [profileSuccess, setProfileSuccess] = useState<string | null>(null);
  const [isExportingData, setIsExportingData] = useState(false);
  const [isDeletingAccount, setIsDeletingAccount] = useState(false);
  const [popiaMessage, setPopiaMessage] = useState<string | null>(null);

  const handleExportData = async () => {
    if (!customer) return;
    try {
      setIsExportingData(true);
      const data = await api.exportCustomerData(customer.id);
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `mevotech-popia-data-archive-${customer.id}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      setPopiaMessage('POPIA Data Subject Access Archive exported successfully.');
      setTimeout(() => setPopiaMessage(null), 6000);
    } catch (err: any) {
      alert(err.message || 'Failed to export data archive');
    } finally {
      setIsExportingData(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (!customer) return;
    const confirmed = window.confirm(
      'POPIA Section 14 Request: Are you sure you want to permanently erase your MEVO TECH customer account and purge all personal identifiable records? This action is irreversible.'
    );
    if (!confirmed) return;

    try {
      setIsDeletingAccount(true);
      await api.deleteCustomerAccount(customer.id);
      alert('Your customer account and personal data have been permanently erased. Logging out.');
      customerLogout();
      onBackToStore();
    } catch (err: any) {
      alert(err.message || 'Failed to delete account');
      setIsDeletingAccount(false);
    }
  };

  // Sync profile form when customer changes
  useEffect(() => {
    if (customer) {
      setProfileName(customer.name);
      setProfilePhone(customer.phone);
      setProfileStreet(customer.defaultAddress?.streetAddress || '');
      setProfileSuburb(customer.defaultAddress?.suburb || '');
      setProfileCity(customer.defaultAddress?.city || 'Johannesburg');
      setProfileProvince(customer.defaultAddress?.province || 'Gauteng');
      setProfilePostal(customer.defaultAddress?.postalCode || '2196');
      setProfileNotes(customer.defaultAddress?.deliveryNotes || '');
    }
  }, [customer]);

  const loadCustomerOrders = async () => {
    if (!customer) return;
    setIsLoadingOrders(true);
    try {
      const data = await api.getCustomerOrders(customer.id || customer.email);
      setOrders(data);
      if (data.length > 0 && !selectedOrderForTracking) {
        setSelectedOrderForTracking(data[0]);
      }
    } catch (e) {
      console.error('Failed to load customer orders', e);
    } finally {
      setIsLoadingOrders(false);
    }
  };

  const loadPriceAlerts = async () => {
    if (!customer?.email) return;
    setIsLoadingAlerts(true);
    try {
      const data = await api.getPriceAlerts(customer.email);
      setPriceAlerts(data);
    } catch (err) {
      console.warn('Could not load price alerts', err);
    } finally {
      setIsLoadingAlerts(false);
    }
  };

  const handleCancelAlert = async (alertId: string) => {
    try {
      await api.cancelPriceAlert(alertId, customer?.email);
      await loadPriceAlerts();
    } catch (err: any) {
      alert(err.message || 'Failed to cancel price alert');
    }
  };

  useEffect(() => {
    loadCustomerOrders();
    loadPriceAlerts();
    refreshAbandonedCarts();
  }, [customer]);

  const handleRestoreSavedCart = async (recoveryToken: string, cartId: string) => {
    setBusyCartId(cartId);
    setCartActionNotice(null);
    const res = await restoreAbandonedCart(recoveryToken);
    setBusyCartId(null);
    if (res.success) {
      setCartActionNotice({
        type: 'success',
        message: `Restored ${res.itemCount || ''} item(s) to your shopping bag${
          res.suggestedCouponCode ? ` with bonus code ${res.suggestedCouponCode}` : ''
        }.`,
      });
    } else {
      setCartActionNotice({
        type: 'error',
        message: res.error || 'Could not restore saved cart.',
      });
    }
  };

  const handleEmailCartLink = async (cartId: string) => {
    setBusyCartId(cartId);
    setCartActionNotice(null);
    const res = await emailAbandonedCartReminder(cartId, customer?.email);
    setBusyCartId(null);
    if (res.success) {
      setCartActionNotice({
        type: 'success',
        message: res.message || `Recovery link emailed to ${customer?.email}.`,
      });
    } else {
      setCartActionNotice({
        type: 'error',
        message: res.error || 'Unable to send recovery email.',
      });
    }
  };

  const handleDismissSavedCart = async (cartId: string) => {
    setBusyCartId(cartId);
    setCartActionNotice(null);
    try {
      await dismissAbandonedCart(cartId);
      setCartActionNotice({
        type: 'success',
        message: 'Saved cart removed from your account.',
      });
    } catch (err: any) {
      setCartActionNotice({
        type: 'error',
        message: err.message || 'Failed to dismiss saved cart.',
      });
    } finally {
      setBusyCartId(null);
    }
  };

  if (!customer) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-16 text-center">
        <div className="w-16 h-16 rounded-2xl bg-orange-50 text-orange-600 flex items-center justify-center mx-auto mb-4 border border-orange-200">
          <User className="w-8 h-8" />
        </div>
        <h2 className="text-2xl font-black text-neutral-900">Sign in to Access Your Account</h2>
        <p className="text-sm text-neutral-500 max-w-md mx-auto mt-2 mb-6">
          Track shipments dispatched from Sandton depot, view previously bought hardware, write reviews, and manage your wishlist.
        </p>
        <div className="flex items-center justify-center gap-4">
          <button
            onClick={() => openAuthModal('login')}
            className="px-6 py-3 bg-orange-600 hover:bg-orange-700 text-white rounded-xl text-xs font-bold uppercase tracking-wider transition-colors shadow-md cursor-pointer"
          >
            Sign In / Register
          </button>
          <button
            onClick={onBackToStore}
            className="px-6 py-3 bg-white hover:bg-neutral-50 text-neutral-700 border border-neutral-300 rounded-xl text-xs font-bold uppercase tracking-wider transition-colors cursor-pointer"
          >
            Return to Store
          </button>
        </div>
      </div>
    );
  }

  // Derive bought items across all paid/shipped/delivered orders
  const boughtItemsMap = new Map<string, { product: Product; order: Order; purchasedAt: string }>();
  for (const order of orders) {
    if (order.status === 'PAID' || order.status === 'PROCESSING' || order.status === 'SHIPPED' || order.status === 'DELIVERED') {
      for (const item of order.items) {
        const fullProd = allProducts.find((p) => p.id === item.productId);
        if (fullProd && !boughtItemsMap.has(fullProd.id)) {
          boughtItemsMap.set(fullProd.id, {
            product: fullProd,
            order,
            purchasedAt: order.createdAt,
          });
        }
      }
    }
  }
  const boughtProducts = Array.from(boughtItemsMap.values());

  // Derive favourite products from wishlist
  const favouriteProducts = allProducts.filter((p) => wishlist.includes(p.id));

  // Orders count metrics
  const activeShipments = orders.filter((o) => o.status === 'SHIPPED' || o.status === 'PROCESSING');
  const deliveredOrders = orders.filter((o) => o.status === 'DELIVERED');

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingProfile(true);
    setProfileSuccess(null);

    try {
      const updatedAddress: ShippingAddress = {
        fullName: profileName,
        phone: profilePhone,
        email: customer.email,
        streetAddress: profileStreet,
        suburb: profileSuburb,
        city: profileCity,
        province: profileProvince,
        postalCode: profilePostal,
        deliveryNotes: profileNotes,
      };

      await updateCustomerProfile({
        name: profileName,
        phone: profilePhone,
        defaultAddress: updatedAddress,
      });

      setProfileSuccess('Profile and default delivery address saved successfully!');
      setTimeout(() => setProfileSuccess(null), 3000);
    } catch (err: any) {
      console.error(err);
    } finally {
      setIsSavingProfile(false);
    }
  };

  return (
    <div className="account-workspace min-h-screen bg-neutral-100/70 pb-20 animate-in fade-in">
      {/* Top Banner & Customer Hero */}
      <div className="bg-neutral-900 text-white border-b border-neutral-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-orange-600 to-indigo-500 text-white flex items-center justify-center font-black text-2xl shadow-lg border-2 border-white/20">
                {customer.name.charAt(0).toUpperCase()}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-xl sm:text-2xl font-black text-white">{customer.name}</h1>
                  <span className="text-[10px] font-bold text-emerald-400 bg-emerald-950/80 px-2 py-0.5 rounded border border-emerald-800">
                    Verified Customer
                  </span>
                </div>
                <p className="text-xs text-neutral-400 mt-0.5">{customer.email} · {customer.phone}</p>
                <p className="text-[11px] text-orange-400 mt-1 flex items-center gap-1.5 font-medium">
                  <ShieldCheck className="w-3.5 h-3.5 text-orange-400" />
                  <span>Sandton Depot Priority Dispatch Privileges Active</span>
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={onBackToStore}
                className="px-4 py-2 bg-neutral-800 hover:bg-neutral-700 text-neutral-200 rounded-xl text-xs font-bold transition-colors border border-neutral-700 cursor-pointer"
              >
                Continue Shopping
              </button>
              <button
                onClick={customerLogout}
                className="px-4 py-2 bg-rose-950/40 hover:bg-rose-900/60 text-rose-300 rounded-xl text-xs font-bold transition-colors border border-rose-900/60 flex items-center gap-1.5 cursor-pointer"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Sign Out</span>
              </button>
            </div>
          </div>

          {/* Navigation Tabs */}
          <div className="flex items-center gap-2 mt-8 overflow-x-auto pb-1 text-xs font-bold">
            <button
              onClick={() => setActiveTab('overview')}
              className={`px-4 py-2.5 rounded-xl transition-all flex items-center gap-2 cursor-pointer ${
                activeTab === 'overview'
                  ? 'bg-orange-600 text-white shadow-md'
                  : 'text-neutral-400 hover:text-white hover:bg-neutral-800'
              }`}
            >
              <User className="w-4 h-4" />
              <span>Overview</span>
            </button>

            <button
              onClick={() => setActiveTab('orders')}
              className={`px-4 py-2.5 rounded-xl transition-all flex items-center gap-2 cursor-pointer ${
                activeTab === 'orders'
                  ? 'bg-orange-600 text-white shadow-md'
                  : 'text-neutral-400 hover:text-white hover:bg-neutral-800'
              }`}
            >
              <Truck className="w-4 h-4" />
              <span>Orders &amp; Tracking ({orders.length})</span>
            </button>

            <button
              onClick={() => setActiveTab('bought')}
              className={`px-4 py-2.5 rounded-xl transition-all flex items-center gap-2 cursor-pointer ${
                activeTab === 'bought'
                  ? 'bg-orange-600 text-white shadow-md'
                  : 'text-neutral-400 hover:text-white hover:bg-neutral-800'
              }`}
            >
              <Package className="w-4 h-4" />
              <span>Bought Hardware ({boughtProducts.length})</span>
            </button>

            <button
              onClick={() => setActiveTab('favourites')}
              className={`px-4 py-2.5 rounded-xl transition-all flex items-center gap-2 cursor-pointer ${
                activeTab === 'favourites'
                  ? 'bg-orange-600 text-white shadow-md'
                  : 'text-neutral-400 hover:text-white hover:bg-neutral-800'
              }`}
            >
              <Heart className="w-4 h-4" />
              <span>Favourites / Wishlist ({favouriteProducts.length})</span>
            </button>

            <button
              onClick={() => setActiveTab('profile')}
              className={`px-4 py-2.5 rounded-xl transition-all flex items-center gap-2 cursor-pointer ${
                activeTab === 'profile'
                  ? 'bg-orange-600 text-white shadow-md'
                  : 'text-neutral-400 hover:text-white hover:bg-neutral-800'
              }`}
            >
              <Settings className="w-4 h-4" />
              <span>Profile &amp; Delivery Address</span>
            </button>

            <button
              onClick={() => setActiveTab('alerts')}
              className={`px-4 py-2.5 rounded-xl transition-all flex items-center gap-2 cursor-pointer ${
                activeTab === 'alerts'
                  ? 'bg-orange-600 text-white shadow-md'
                  : 'text-neutral-400 hover:text-white hover:bg-neutral-800'
              }`}
            >
              <Bell className="w-4 h-4" />
              <span>Price Alerts ({priceAlerts.filter((a) => a.status === 'ACTIVE').length})</span>
            </button>

            <button
              onClick={() => setActiveTab('saved_carts')}
              className={`px-4 py-2.5 rounded-xl transition-all flex items-center gap-2 cursor-pointer ${
                activeTab === 'saved_carts'
                  ? 'bg-orange-600 text-white shadow-md'
                  : 'text-neutral-400 hover:text-white hover:bg-neutral-800'
              }`}
            >
              <Bookmark className="w-4 h-4" />
              <span>Saved Carts ({abandonedCarts.length})</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

        {/* TAB 1: OVERVIEW */}
        {activeTab === 'overview' && (
          <div className="space-y-8">
            {/* Quick Stats Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
              <div className="bg-white p-5 rounded-2xl border border-neutral-200 shadow-xs flex items-center justify-between">
                <div>
                  <span className="text-xs text-neutral-500 font-semibold uppercase tracking-wider">Total Orders</span>
                  <p className="text-2xl font-black font-mono text-neutral-900 mt-1">{orders.length}</p>
                </div>
                <div className="w-12 h-12 rounded-xl bg-orange-50 text-orange-600 flex items-center justify-center">
                  <Package className="w-6 h-6" />
                </div>
              </div>

              <div className="bg-white p-5 rounded-2xl border border-neutral-200 shadow-xs flex items-center justify-between">
                <div>
                  <span className="text-xs text-neutral-500 font-semibold uppercase tracking-wider">In Transit</span>
                  <p className="text-2xl font-black font-mono text-neutral-900 mt-1">{activeShipments.length}</p>
                </div>
                <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
                  <Truck className="w-6 h-6" />
                </div>
              </div>

              <div className="bg-white p-5 rounded-2xl border border-neutral-200 shadow-xs flex items-center justify-between">
                <div>
                  <span className="text-xs text-neutral-500 font-semibold uppercase tracking-wider">Bought Tech</span>
                  <p className="text-2xl font-black font-mono text-neutral-900 mt-1">{boughtProducts.length}</p>
                </div>
                <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                  <CheckCircle2 className="w-6 h-6" />
                </div>
              </div>

              <div className="bg-white p-5 rounded-2xl border border-neutral-200 shadow-xs flex items-center justify-between">
                <div>
                  <span className="text-xs text-neutral-500 font-semibold uppercase tracking-wider">Saved Wishlist</span>
                  <p className="text-2xl font-black font-mono text-neutral-900 mt-1">{favouriteProducts.length}</p>
                </div>
                <div className="w-12 h-12 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center">
                  <Heart className="w-6 h-6" />
                </div>
              </div>

              <div
                onClick={() => setActiveTab('alerts')}
                className="bg-white p-5 rounded-2xl border border-neutral-200 shadow-xs flex items-center justify-between cursor-pointer hover:border-orange-500 transition-colors"
              >
                <div>
                  <span className="text-xs text-neutral-500 font-semibold uppercase tracking-wider">Price Alerts</span>
                  <p className="text-2xl font-black font-mono text-orange-600 mt-1">
                    {priceAlerts.filter((a) => a.status === 'ACTIVE').length}
                  </p>
                </div>
                <div className="w-12 h-12 rounded-xl bg-orange-50 text-orange-600 flex items-center justify-center">
                  <Bell className="w-6 h-6" />
                </div>
              </div>
            </div>

            {/* Recent Orders Overview */}
            <div className="bg-white rounded-2xl border border-neutral-200 shadow-xs overflow-hidden">
              <div className="p-5 border-b border-neutral-200 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-orange-600" />
                  <h3 className="text-sm font-bold text-neutral-900">Recent Hardware Shipments</h3>
                </div>
                <button
                  onClick={() => setActiveTab('orders')}
                  className="text-xs font-bold text-orange-600 hover:text-orange-700 flex items-center gap-1 cursor-pointer"
                >
                  <span>View all orders</span>
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>

              {orders.length === 0 ? (
                <div className="p-8 text-center text-xs text-neutral-500">
                  <p>You have not placed any orders yet.</p>
                </div>
              ) : (
                <div className="divide-y divide-neutral-200">
                  {orders.slice(0, 3).map((order) => (
                    <div key={order.reference} className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div>
                        <div className="flex items-center gap-2.5">
                          <span className="font-mono font-bold text-sm text-neutral-900">{order.reference}</span>
                          <span
                            className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase ${
                              order.status === 'DELIVERED'
                                ? 'bg-emerald-100 text-emerald-800'
                                : order.status === 'SHIPPED'
                                ? 'bg-orange-100 text-orange-800'
                                : order.status === 'PAID'
                                ? 'bg-blue-100 text-blue-800'
                                : 'bg-amber-100 text-amber-800'
                            }`}
                          >
                            {order.status.replace('_', ' ')}
                          </span>
                        </div>
                        <p className="text-xs text-neutral-500 mt-1">
                          {order.items.length} {order.items.length === 1 ? 'item' : 'items'} · Placed on {new Date(order.createdAt).toLocaleDateString()}
                        </p>
                      </div>

                      <div className="flex items-center gap-3 self-end sm:self-auto">
                        <span className="font-mono font-black text-sm text-neutral-900">
                          {formatZAR(order.totalCents)}
                        </span>
                        <button
                          onClick={() => {
                            setSelectedOrderForTracking(order);
                            setActiveTab('orders');
                          }}
                          className="px-3 py-1.5 bg-neutral-900 hover:bg-orange-600 text-white rounded-lg text-xs font-bold transition-colors cursor-pointer"
                        >
                          Track Shipment
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Recoverable Abandoned Carts Spotlight */}
            {abandonedCarts.length > 0 && (
              <div className="bg-gradient-to-r from-amber-50 to-orange-50 rounded-2xl border border-amber-200 p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-xs">
                <div className="flex items-start gap-3">
                  <div className="w-11 h-11 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center shrink-0">
                    <Clock className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-neutral-900">
                      You have {abandonedCarts.length} saved shopping {abandonedCarts.length === 1 ? 'bag' : 'bags'} ready to resume
                    </h3>
                    <p className="text-xs text-neutral-600 mt-0.5">
                      Latest saved total:{' '}
                      <strong className="font-mono text-neutral-900">
                        {formatZAR(abandonedCarts[0].estimatedTotalCents)}
                      </strong>
                      {abandonedCarts[0].recoveryIncentiveCode && (
                        <>
                          {' '}· Bonus voucher:{' '}
                          <span className="font-mono font-bold text-orange-700">
                            {abandonedCarts[0].recoveryIncentiveCode}
                          </span>
                        </>
                      )}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() =>
                      handleRestoreSavedCart(abandonedCarts[0].recoveryToken, abandonedCarts[0].id)
                    }
                    className="px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer"
                  >
                    Restore Latest Cart
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTab('saved_carts')}
                    className="px-4 py-2 bg-white hover:bg-neutral-50 border border-neutral-300 text-neutral-800 rounded-xl text-xs font-bold transition-colors cursor-pointer"
                  >
                    Manage ({abandonedCarts.length})
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB 2: ORDERS & TRACKING */}
        {activeTab === 'orders' && (
          <div className="space-y-8">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold text-neutral-900">Your Orders &amp; Door-to-Door Delivery Tracking</h2>
                <p className="text-xs text-neutral-500 mt-0.5">Real-time status updates from our Sandton logistics depot</p>
              </div>
              <button
                onClick={loadCustomerOrders}
                className="px-3 py-1.5 rounded-xl border border-neutral-300 bg-white text-xs font-bold text-neutral-700 hover:bg-neutral-50 flex items-center gap-1.5 cursor-pointer"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Refresh Status</span>
              </button>
            </div>

            {/* Active Tracking Spotlight Card (if an order is selected) */}
            {selectedOrderForTracking && (
              <div className="bg-white rounded-2xl border-2 border-orange-200 shadow-sm overflow-hidden p-6 space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-neutral-200 gap-3">
                  <div>
                    <span className="text-xs font-bold uppercase tracking-wider text-orange-600">
                      Live Delivery Progress
                    </span>
                    <h3 className="text-lg font-black text-neutral-900 font-mono mt-0.5">
                      {selectedOrderForTracking.reference}
                    </h3>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-neutral-500">Carrier:</span>
                    <span className="text-xs font-bold text-neutral-800 bg-neutral-100 px-2.5 py-1 rounded-lg">
                      {selectedOrderForTracking.courierName || 'The Courier Guy'}
                    </span>
                    {selectedOrderForTracking.trackingNumber && (
                      <span className="font-mono text-xs font-bold text-orange-700 bg-orange-50 px-2.5 py-1 rounded-lg border border-orange-200">
                        AWB: {selectedOrderForTracking.trackingNumber}
                      </span>
                    )}
                  </div>
                </div>

                {/* Tracking Milestones Stepper */}
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 relative pt-2">
                  {[
                    { label: 'Order Confirmed', desc: 'Payment approved', done: true },
                    { label: 'Sandton Depot Packed', desc: 'Bench verified & sealed', done: ['PROCESSING', 'SHIPPED', 'DELIVERED'].includes(selectedOrderForTracking.status) },
                    { label: 'In Transit', desc: 'Handed to courier', done: ['SHIPPED', 'DELIVERED'].includes(selectedOrderForTracking.status) },
                    { label: 'Delivered', desc: 'Signed for at address', done: selectedOrderForTracking.status === 'DELIVERED' },
                  ].map((step, idx) => (
                    <div
                      key={idx}
                      className={`p-3.5 rounded-xl border flex flex-col justify-between ${
                        step.done
                          ? 'bg-orange-50/70 border-orange-300 text-orange-950'
                          : 'bg-neutral-50 border-neutral-200 text-neutral-400'
                      }`}
                    >
                      <div className="flex items-center gap-2 mb-2">
                        <div
                          className={`w-6 h-6 rounded-full flex items-center justify-center font-bold text-xs ${
                            step.done ? 'bg-orange-600 text-white' : 'bg-neutral-200 text-neutral-500'
                          }`}
                        >
                          {step.done ? '✓' : idx + 1}
                        </div>
                        <span className="font-bold text-xs">{step.label}</span>
                      </div>
                      <p className="text-[11px] text-neutral-500">{step.desc}</p>
                    </div>
                  ))}
                </div>

                {/* Items in this shipment */}
                <div className="pt-2">
                  <span className="text-xs font-bold text-neutral-700 uppercase tracking-wider block mb-3">
                    Shipment Contents
                  </span>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {selectedOrderForTracking.items.map((item, idx) => {
                      const fullProd = allProducts.find((p) => p.id === item.productId);
                      return (
                        <div key={idx} className="flex items-center gap-3 p-3 bg-neutral-50 rounded-xl border border-neutral-200">
                          {fullProd && (
                            <img src={fullProd.primaryImage} alt="" className="w-12 h-12 object-cover rounded-lg border border-neutral-200" />
                          )}
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-bold text-neutral-900 truncate">{item.name}</p>
                            <p className="text-[11px] text-neutral-500">Qty: {item.quantity} · {formatZAR(item.unitPriceCents)}</p>
                          </div>
                          {fullProd && (
                            <div className="flex items-center gap-1.5 shrink-0">
                              <button
                                onClick={() => {
                                  setReviewProduct(fullProd);
                                }}
                                className="px-2.5 py-1 bg-amber-500 hover:bg-amber-600 text-white rounded text-[11px] font-bold cursor-pointer"
                              >
                                Review
                              </button>
                              <button
                                onClick={() => setShareProduct(fullProd)}
                                className="p-1 rounded text-neutral-500 hover:text-orange-600 cursor-pointer"
                                title="Share"
                              >
                                <Share2 className="w-4 h-4" />
                              </button>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Actions Bar */}
                <div className="flex flex-wrap items-center justify-between pt-4 border-t border-neutral-200 gap-3">
                  <div className="text-xs text-neutral-500">
                    Delivery to: <strong>{selectedOrderForTracking.shippingAddress.streetAddress}, {selectedOrderForTracking.shippingAddress.city}</strong>
                  </div>

                  <div className="flex items-center gap-2">
                    {selectedOrderForTracking.status === 'PENDING_PAYMENT' && onProceedToPayOrder && (
                      <button
                        onClick={() => onProceedToPayOrder(selectedOrderForTracking)}
                        className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 cursor-pointer"
                      >
                        <CreditCard className="w-4 h-4" />
                        <span>Pay Now ({formatZAR(selectedOrderForTracking.totalCents)})</span>
                      </button>
                    )}

                    <button
                      onClick={() => setSelectedInvoiceOrder(selectedOrderForTracking)}
                      className="px-3.5 py-2 bg-white hover:bg-neutral-50 text-neutral-700 border border-neutral-300 font-bold rounded-xl text-xs flex items-center gap-1.5 cursor-pointer"
                    >
                      <FileText className="w-4 h-4 text-orange-600" />
                      <span>View Tax Invoice</span>
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* All Orders List */}
            <div className="bg-white rounded-2xl border border-neutral-200 shadow-xs overflow-hidden">
              <div className="p-5 border-b border-neutral-200 font-bold text-xs text-neutral-500 uppercase tracking-wider">
                Full Order History ({orders.length})
              </div>

              {orders.length === 0 ? (
                <div className="p-12 text-center text-xs text-neutral-500">
                  <Package className="w-10 h-10 text-neutral-300 mx-auto mb-2" />
                  <p>No orders on file yet. Products you purchase will appear here with live tracking.</p>
                </div>
              ) : (
                <div className="divide-y divide-neutral-200">
                  {orders.map((order) => (
                    <div
                      key={order.reference}
                      onClick={() => setSelectedOrderForTracking(order)}
                      className={`p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 cursor-pointer hover:bg-neutral-50 transition-colors ${
                        selectedOrderForTracking?.reference === order.reference ? 'bg-orange-50/40' : ''
                      }`}
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-3">
                          <span className="font-mono font-bold text-sm text-neutral-900">{order.reference}</span>
                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${
                              order.status === 'DELIVERED'
                                ? 'bg-emerald-100 text-emerald-800'
                                : order.status === 'SHIPPED'
                                ? 'bg-orange-100 text-orange-800'
                                : order.status === 'PAID'
                                ? 'bg-blue-100 text-blue-800'
                                : 'bg-amber-100 text-amber-800'
                            }`}
                          >
                            {order.status.replace('_', ' ')}
                          </span>
                        </div>
                        <p className="text-xs text-neutral-500">
                          Placed on {new Date(order.createdAt).toLocaleDateString()} · {order.items.length} items
                        </p>
                      </div>

                      <div className="flex items-center gap-4">
                        <span className="font-mono font-black text-sm text-neutral-900">
                          {formatZAR(order.totalCents)}
                        </span>
                        <span className="text-xs font-bold text-orange-600 flex items-center gap-1">
                          <span>Details</span>
                          <ChevronRight className="w-4 h-4" />
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 3: BOUGHT HARDWARE ("including bought" & reviews) */}
        {activeTab === 'bought' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold text-neutral-900">Your Bought Tech &amp; Hardware Reviews</h2>
                <p className="text-xs text-neutral-500 mt-0.5">
                  Verified hardware purchases linked to your account. Write reviews to help other shoppers!
                </p>
              </div>
            </div>

            {boughtProducts.length === 0 ? (
              <div className="bg-white rounded-2xl border border-neutral-200 p-12 text-center max-w-md mx-auto my-8">
                <Package className="w-12 h-12 text-neutral-300 mx-auto mb-3" />
                <h3 className="text-sm font-bold text-neutral-900">No Purchased Items Found Yet</h3>
                <p className="text-xs text-neutral-500 mt-1 mb-4">
                  Once your checkout is completed, all your bought tech will populate here with verified buyer badges.
                </p>
                <button
                  onClick={onBackToStore}
                  className="px-4 py-2 bg-orange-600 text-white rounded-xl text-xs font-bold"
                >
                  Explore Storefront
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {boughtProducts.map(({ product, order, purchasedAt }) => (
                  <div
                    key={product.id}
                    className="bg-white rounded-2xl border border-neutral-200 overflow-hidden shadow-xs hover:border-orange-400 transition-all flex flex-col justify-between"
                  >
                    <div className="relative aspect-4/3 bg-neutral-100 overflow-hidden">
                      <img src={product.primaryImage} alt={product.name} className="w-full h-full object-cover" />
                      <span className="absolute top-3 left-3 bg-emerald-600 text-white text-[10px] font-bold px-2 py-0.5 rounded flex items-center gap-1">
                        <ShieldCheck className="w-3 h-3" />
                        <span>Verified Purchase</span>
                      </span>
                    </div>

                    <div className="p-4 flex-1 flex flex-col justify-between space-y-4">
                      <div>
                        <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider block">
                          {product.brand} · {product.category}
                        </span>
                        <h4
                          onClick={() => onSelectProduct(product)}
                          className="text-sm font-bold text-neutral-900 hover:text-orange-600 transition-colors cursor-pointer mt-1"
                        >
                          {product.name}
                        </h4>
                        <p className="text-xs text-neutral-500 mt-1">
                          Purchased on {new Date(purchasedAt).toLocaleDateString()}
                        </p>
                      </div>

                      <div className="pt-3 border-t border-neutral-100 flex items-center justify-between gap-2">
                        <button
                          onClick={() => setReviewProduct(product)}
                          className="flex-1 py-2 bg-amber-500 hover:bg-amber-600 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                        >
                          <Star className="w-3.5 h-3.5 fill-white" />
                          <span>Write Review</span>
                        </button>

                        <button
                          onClick={() => {
                            addItem(product, undefined, 1);
                          }}
                          className="py-2 px-3 bg-orange-600 hover:bg-orange-700 text-white font-bold rounded-xl text-xs flex items-center gap-1 transition-colors cursor-pointer"
                          title="Buy again"
                        >
                          <ShoppingBag className="w-3.5 h-3.5" />
                          <span>Re-order</span>
                        </button>

                        <button
                          onClick={() => setShareProduct(product)}
                          className="p-2 border border-neutral-300 rounded-xl hover:bg-neutral-50 text-neutral-600 transition-colors cursor-pointer"
                          title="Share item"
                        >
                          <Share2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB 4: FAVOURITES / WISHLIST */}
        {activeTab === 'favourites' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold text-neutral-900">Your Saved Hardware Favourites</h2>
                <p className="text-xs text-neutral-500 mt-0.5">
                  Items you have liked across the store, saved to your customer profile.
                </p>
              </div>
            </div>

            {favouriteProducts.length === 0 ? (
              <div className="bg-white rounded-2xl border border-neutral-200 p-12 text-center max-w-md mx-auto my-8">
                <Heart className="w-12 h-12 text-neutral-300 mx-auto mb-3" />
                <h3 className="text-sm font-bold text-neutral-900">No Favourites Saved Yet</h3>
                <p className="text-xs text-neutral-500 mt-1 mb-4">
                  Click the heart icon on any product card or detail page to save it for later.
                </p>
                <button
                  onClick={onBackToStore}
                  className="px-4 py-2 bg-orange-600 text-white rounded-xl text-xs font-bold"
                >
                  Browse Hardware
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                {favouriteProducts.map((product) => (
                  <div
                    key={product.id}
                    className="bg-white rounded-2xl border border-neutral-200 overflow-hidden shadow-xs hover:border-orange-400 transition-all flex flex-col justify-between"
                  >
                    <div
                      onClick={() => onSelectProduct(product)}
                      className="relative aspect-square bg-neutral-100 overflow-hidden cursor-pointer"
                    >
                      <img src={product.primaryImage} alt={product.name} className="w-full h-full object-cover" />
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleWishlist(product.id);
                        }}
                        className="absolute top-2.5 right-2.5 p-1.5 rounded-full bg-white/90 text-rose-500 shadow-sm cursor-pointer"
                      >
                        <Heart className="w-4 h-4 fill-rose-500" />
                      </button>
                    </div>

                    <div className="p-4 flex-1 flex flex-col justify-between space-y-3">
                      <div>
                        <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider block">
                          {product.brand}
                        </span>
                        <h4
                          onClick={() => onSelectProduct(product)}
                          className="text-xs font-bold text-neutral-900 line-clamp-2 hover:text-orange-600 transition-colors cursor-pointer mt-0.5"
                        >
                          {product.name}
                        </h4>
                      </div>

                      <div className="pt-2 border-t border-neutral-100 flex items-center justify-between">
                        <span className="font-mono font-black text-sm text-neutral-900">
                          {formatZAR(product.promotionalPriceCents || product.priceCents)}
                        </span>
                        <button
                          onClick={() => addItem(product, undefined, 1)}
                          className="px-3 py-1.5 bg-orange-600 hover:bg-orange-700 text-white font-bold rounded-lg text-xs flex items-center gap-1 transition-colors cursor-pointer"
                        >
                          <ShoppingBag className="w-3.5 h-3.5" />
                          <span>Add</span>
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB 5: PROFILE & DELIVERY ADDRESS */}
        {activeTab === 'profile' && (
          <div className="max-w-2xl bg-white rounded-2xl border border-neutral-200 shadow-xs p-6 sm:p-8 space-y-6">
            <div>
              <h2 className="text-lg font-bold text-neutral-900">Customer Profile &amp; Default Delivery Address</h2>
              <p className="text-xs text-neutral-500 mt-0.5">
                Saved shipping address is automatically pre-filled at checkout for lightning-fast courier dispatch.
              </p>
            </div>

            {profileSuccess && (
              <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
                <span>{profileSuccess}</span>
              </div>
            )}

            <form onSubmit={handleSaveProfile} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-bold text-neutral-700 mb-1">Full Name</label>
                  <input
                    type="text"
                    required
                    value={profileName}
                    onChange={(e) => setProfileName(e.target.value)}
                    className="w-full px-3 py-2 bg-neutral-50 border border-neutral-300 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-orange-500 font-medium"
                  />
                </div>

                <div>
                  <label className="block font-bold text-neutral-700 mb-1">Email Address</label>
                  <input
                    type="email"
                    disabled
                    value={customer.email}
                    className="w-full px-3 py-2 bg-neutral-100 border border-neutral-200 rounded-xl font-medium text-neutral-500 cursor-not-allowed"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-neutral-700 mb-1">South African Phone (+27)</label>
                <input
                  type="text"
                  required
                  value={profilePhone}
                  onChange={(e) => setProfilePhone(e.target.value)}
                  className="w-full px-3 py-2 bg-neutral-50 border border-neutral-300 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-orange-500 font-medium"
                />
              </div>

              <div className="pt-2 border-t border-neutral-200">
                <span className="text-[11px] font-bold text-neutral-500 uppercase tracking-wider block mb-3">
                  Default Courier Delivery Address
                </span>

                <div className="space-y-3">
                  <div>
                    <label className="block font-bold text-neutral-700 mb-1">Street Address</label>
                    <input
                      type="text"
                      required
                      value={profileStreet}
                      onChange={(e) => setProfileStreet(e.target.value)}
                      placeholder="e.g. 14 Rivonia Road"
                      className="w-full px-3 py-2 bg-neutral-50 border border-neutral-300 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-orange-500 font-medium"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block font-bold text-neutral-700 mb-1">Suburb</label>
                      <input
                        type="text"
                        value={profileSuburb}
                        onChange={(e) => setProfileSuburb(e.target.value)}
                        placeholder="e.g. Sandhurst"
                        className="w-full px-3 py-2 bg-neutral-50 border border-neutral-300 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-orange-500 font-medium"
                      />
                    </div>

                    <div>
                      <label className="block font-bold text-neutral-700 mb-1">City / Metro</label>
                      <input
                        type="text"
                        required
                        value={profileCity}
                        onChange={(e) => setProfileCity(e.target.value)}
                        placeholder="e.g. Johannesburg"
                        className="w-full px-3 py-2 bg-neutral-50 border border-neutral-300 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-orange-500 font-medium"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block font-bold text-neutral-700 mb-1">Province</label>
                      <select
                        value={profileProvince}
                        onChange={(e) => setProfileProvince(e.target.value)}
                        className="w-full px-3 py-2 bg-neutral-50 border border-neutral-300 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-orange-500 font-medium"
                      >
                        <option value="Gauteng">Gauteng</option>
                        <option value="Western Cape">Western Cape</option>
                        <option value="KwaZulu-Natal">KwaZulu-Natal</option>
                        <option value="Eastern Cape">Eastern Cape</option>
                        <option value="Free State">Free State</option>
                        <option value="Mpumalanga">Mpumalanga</option>
                        <option value="Limpopo">Limpopo</option>
                        <option value="North West">North West</option>
                        <option value="Northern Cape">Northern Cape</option>
                      </select>
                    </div>

                    <div>
                      <label className="block font-bold text-neutral-700 mb-1">Postal Code</label>
                      <input
                        type="text"
                        required
                        value={profilePostal}
                        onChange={(e) => setProfilePostal(e.target.value)}
                        placeholder="e.g. 2196"
                        className="w-full px-3 py-2 bg-neutral-50 border border-neutral-300 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-orange-500 font-medium"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block font-bold text-neutral-700 mb-1">Special Delivery Instructions</label>
                    <input
                      type="text"
                      value={profileNotes}
                      onChange={(e) => setProfileNotes(e.target.value)}
                      placeholder="e.g. Security gate buzzer #42 or call upon arrival"
                      className="w-full px-3 py-2 bg-neutral-50 border border-neutral-300 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-orange-500 font-medium"
                    />
                  </div>
                </div>
              </div>

              <div className="pt-4 flex justify-end">
                <button
                  type="submit"
                  disabled={isSavingProfile}
                  className="px-6 py-2.5 bg-orange-600 hover:bg-orange-700 text-white font-bold rounded-xl shadow-md transition-all cursor-pointer disabled:opacity-50"
                >
                  {isSavingProfile ? 'Saving...' : 'Save Profile & Address'}
                </button>
              </div>
            </form>

            {/* POPIA Privacy & Account Security Controls */}
            <div className="bg-white rounded-2xl border border-neutral-200 p-6 shadow-sm space-y-6">
              <div className="flex items-center gap-3 pb-3 border-b border-neutral-100">
                <div className="w-10 h-10 rounded-xl bg-orange-50 text-orange-600 flex items-center justify-center">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-base text-neutral-900">POPIA Privacy &amp; Cryptographic Security</h3>
                  <p className="text-xs text-neutral-500">Protection of Personal Information Act (Act 4 of 2013) &amp; Account Protection</p>
                </div>
              </div>

              {popiaMessage && (
                <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>{popiaMessage}</span>
                </div>
              )}

              {/* Security Badges */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="p-3 bg-neutral-50 rounded-xl border border-neutral-200/60">
                  <div className="flex items-center gap-2 text-orange-600 font-bold text-xs mb-1">
                    <Lock className="w-3.5 h-3.5" />
                    <span>Password Security</span>
                  </div>
                  <p className="text-[11px] text-neutral-600">Bcrypt Salted &amp; Hashed (Cost Factor 10) · Never stored in plaintext.</p>
                </div>

                <div className="p-3 bg-neutral-50 rounded-xl border border-neutral-200/60">
                  <div className="flex items-center gap-2 text-orange-600 font-bold text-xs mb-1">
                    <ShieldCheck className="w-3.5 h-3.5" />
                    <span>Edge Hardening</span>
                  </div>
                  <p className="text-[11px] text-neutral-600">OWASP Helmet, HSTS, X-Frame protection &amp; IP rate-limiting enforced.</p>
                </div>

                <div className="p-3 bg-neutral-50 rounded-xl border border-neutral-200/60">
                  <div className="flex items-center gap-2 text-orange-600 font-bold text-xs mb-1">
                    <CreditCard className="w-3.5 h-3.5" />
                    <span>PCI DSS Level 1</span>
                  </div>
                  <p className="text-[11px] text-neutral-600">Offloaded to PayFast &amp; Paystack · Card data never hits Mevo servers.</p>
                </div>
              </div>

              {/* POPIA Subject Access Rights */}
              <div className="pt-2 border-t border-neutral-100 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                  <h4 className="font-bold text-xs text-neutral-800">Your Data Subject Rights (Section 14 &amp; 23)</h4>
                  <p className="text-xs text-neutral-500 mt-0.5">
                    Download an official JSON copy of all personal identifiable information (PII) and purchase records, or exercise your right to be forgotten.
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={handleExportData}
                    disabled={isExportingData}
                    className="px-3.5 py-2 bg-neutral-100 hover:bg-neutral-200 text-neutral-800 text-xs font-bold rounded-xl flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
                  >
                    <Download className="w-3.5 h-3.5 text-orange-600" />
                    <span>{isExportingData ? 'Generating...' : 'Export Data Archive'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleDeleteAccount}
                    disabled={isDeletingAccount}
                    className="px-3.5 py-2 bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 text-xs font-bold rounded-xl flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
                  >
                    <Trash2 className="w-3.5 h-3.5 text-red-600" />
                    <span>{isDeletingAccount ? 'Purging...' : 'Delete Account (POPIA)'}</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 6: PRICE DROP ALERTS */}
        {activeTab === 'alerts' && (
          <div className="space-y-6">
            <div className="bg-white p-6 rounded-2xl border border-neutral-200 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-orange-50 text-orange-600 flex items-center justify-center">
                    <Bell className="w-4 h-4" />
                  </div>
                  <h2 className="text-lg font-black text-neutral-900">Your Price Drop Subscriptions</h2>
                </div>
                <p className="text-xs text-neutral-500 mt-1 max-w-xl">
                  Automated notifications sent to <strong className="text-neutral-700">{customer.email}</strong> the second tracked Sandton Depot items drop to or below your threshold.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={loadPriceAlerts}
                  disabled={isLoadingAlerts}
                  className="px-3.5 py-2 bg-neutral-100 hover:bg-neutral-200 text-neutral-700 rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isLoadingAlerts ? 'animate-spin text-orange-600' : ''}`} />
                  <span>Refresh</span>
                </button>
                <button
                  type="button"
                  onClick={onBackToStore}
                  className="px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer"
                >
                  Track More Tech
                </button>
              </div>
            </div>

            {priceAlerts.length === 0 ? (
              <div className="bg-white rounded-2xl border border-neutral-200 p-12 text-center space-y-4">
                <div className="w-16 h-16 rounded-2xl bg-orange-50 text-orange-600 flex items-center justify-center mx-auto">
                  <TrendingDown className="w-8 h-8" />
                </div>
                <div className="max-w-sm mx-auto">
                  <h3 className="text-base font-bold text-neutral-900">No active price drop alerts</h3>
                  <p className="text-xs text-neutral-500 mt-1">
                    When you see an item you love in our store, click "Notify Me When Price Drops" to get instant alerts the second the price drops!
                  </p>
                </div>
                <button
                  type="button"
                  onClick={onBackToStore}
                  className="px-6 py-2.5 bg-neutral-900 hover:bg-orange-600 text-white rounded-xl text-xs font-bold uppercase tracking-wider transition-colors cursor-pointer"
                >
                  Explore Hardware Catalogue
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {priceAlerts.map((alert) => {
                  const matchingProduct = allProducts.find((p) => p.id === alert.productId);
                  const currentPrice = matchingProduct
                    ? matchingProduct.promotionalPriceCents ?? matchingProduct.priceCents
                    : alert.initialPriceCents;

                  return (
                    <div
                      key={alert.id}
                      className="bg-white rounded-2xl border border-neutral-200 shadow-xs hover:shadow-md transition-shadow p-5 flex flex-col justify-between space-y-4"
                    >
                      <div className="space-y-3">
                        {/* Status Badge & Strategy */}
                        <div className="flex items-center justify-between text-xs">
                          {alert.status === 'ACTIVE' && (
                            <span className="inline-flex items-center gap-1.5 text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
                              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                              Active Tracker
                            </span>
                          )}
                          {alert.status === 'TRIGGERED' && (
                            <span className="inline-flex items-center gap-1.5 text-[11px] font-bold text-amber-700 bg-amber-50 px-2.5 py-1 rounded-full border border-amber-200">
                              <Sparkles className="w-3 h-3 text-amber-600" />
                              Triggered &amp; Dispatched
                            </span>
                          )}
                          {alert.status === 'CANCELLED' && (
                            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-neutral-500 bg-neutral-100 px-2.5 py-1 rounded-full">
                              Cancelled
                            </span>
                          )}

                          <span className="text-[10px] uppercase font-mono text-neutral-400">
                            {alert.targetType === '10_percent'
                              ? '10% Drop'
                              : alert.targetType === '20_percent'
                              ? '20% Drop'
                              : alert.targetType === 'custom'
                              ? 'Custom Target'
                              : 'Any Drop'}
                          </span>
                        </div>

                        {/* Product Info */}
                        <div className="flex items-center gap-3">
                          <img
                            src={alert.productImage || 'https://images.unsplash.com/photo-1527443224154-c4a3942d3acf?w=150'}
                            alt={alert.productName}
                            className="w-16 h-16 rounded-xl object-cover border border-neutral-200 shrink-0 bg-neutral-50"
                          />
                          <div className="min-w-0 flex-1">
                            <h4
                              onClick={() => {
                                if (matchingProduct) onSelectProduct(matchingProduct);
                              }}
                              className="text-sm font-bold text-neutral-900 truncate hover:text-orange-600 cursor-pointer"
                            >
                              {alert.productName}
                            </h4>
                            <p className="text-[11px] text-neutral-400 font-mono">
                              Subscribed at: {formatZAR(alert.initialPriceCents)}
                            </p>
                          </div>
                        </div>

                        {/* Price Target Card */}
                        <div className="p-3 bg-neutral-50 rounded-xl border border-neutral-200 space-y-1.5 text-xs">
                          <div className="flex justify-between items-center">
                            <span className="text-neutral-500">Alert Target:</span>
                            <span className="font-mono font-bold text-orange-600">
                              ≤ {formatZAR(alert.targetPriceCents)}
                            </span>
                          </div>
                          <div className="flex justify-between items-center pt-1 border-t border-neutral-200/60">
                            <span className="text-neutral-500">Current Store Price:</span>
                            <span className="font-mono font-bold text-neutral-900">
                              {formatZAR(currentPrice)}
                            </span>
                          </div>
                          {alert.status === 'TRIGGERED' && alert.lastNotifiedPriceCents && (
                            <div className="flex justify-between items-center pt-1 border-t border-neutral-200/60 text-emerald-700 font-semibold">
                              <span>Alert Triggered At:</span>
                              <span className="font-mono">{formatZAR(alert.lastNotifiedPriceCents)}</span>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Action Buttons */}
                      <div className="flex items-center gap-2 pt-2 border-t border-neutral-100">
                        {matchingProduct && (
                          <button
                            type="button"
                            onClick={() => onSelectProduct(matchingProduct)}
                            className="flex-1 py-2 px-3 bg-neutral-100 hover:bg-neutral-200 text-neutral-800 text-xs font-bold rounded-xl transition-colors cursor-pointer flex items-center justify-center gap-1.5"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                            <span>View Specs</span>
                          </button>
                        )}
                        {alert.status === 'ACTIVE' && (
                          <button
                            type="button"
                            onClick={() => handleCancelAlert(alert.id)}
                            className="py-2 px-3 text-xs font-bold text-neutral-500 hover:text-red-600 hover:bg-red-50 rounded-xl transition-colors cursor-pointer"
                          >
                            Cancel Alert
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* TAB 7: SAVED & ABANDONED CARTS */}
        {activeTab === 'saved_carts' && (
          <div className="space-y-6">
            <div className="bg-white p-6 rounded-2xl border border-neutral-200 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
                    <Bookmark className="w-4 h-4" />
                  </div>
                  <h2 className="text-lg font-black text-neutral-900">Saved &amp; Abandoned Carts</h2>
                </div>
                <p className="text-xs text-neutral-500 mt-1 max-w-xl">
                  Resume unfinished checkouts with verified Sandton inventory pricing and automatic bonus recovery vouchers.
                </p>
              </div>

              <button
                type="button"
                onClick={refreshAbandonedCarts}
                disabled={isLoadingAbandonedCarts}
                className="px-3.5 py-2 bg-neutral-100 hover:bg-neutral-200 text-neutral-700 rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isLoadingAbandonedCarts ? 'animate-spin text-orange-600' : ''}`} />
                <span>Refresh</span>
              </button>
            </div>

            {cartActionNotice && (
              <div
                className={`p-3.5 rounded-xl border text-xs flex items-center gap-2 ${
                  cartActionNotice.type === 'success'
                    ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                    : 'bg-rose-50 border-rose-200 text-rose-700'
                }`}
              >
                {cartActionNotice.type === 'success' ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                ) : (
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                )}
                <span className="font-semibold">{cartActionNotice.message}</span>
              </div>
            )}

            {abandonedCarts.length === 0 ? (
              <div className="bg-white rounded-2xl border border-neutral-200 p-12 text-center space-y-4">
                <div className="w-16 h-16 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center mx-auto">
                  <ShoppingBag className="w-8 h-8" />
                </div>
                <div className="max-w-sm mx-auto">
                  <h3 className="text-base font-bold text-neutral-900">No saved or abandoned carts</h3>
                  <p className="text-xs text-neutral-500 mt-1">
                    When you save a shopping bag for later or exit checkout mid-way, it will appear here for one-click recovery.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={onBackToStore}
                  className="px-6 py-2.5 bg-neutral-900 hover:bg-orange-600 text-white rounded-xl text-xs font-bold uppercase tracking-wider transition-colors cursor-pointer"
                >
                  Browse Hardware Store
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                {abandonedCarts.map((cart) => (
                  <div
                    key={cart.id}
                    className="bg-white rounded-2xl border border-neutral-200 shadow-xs p-5 space-y-4"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-neutral-100">
                      <div className="space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-mono text-xs font-bold text-neutral-900">{cart.id}</span>
                          <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-200">
                            Saved Checkout
                          </span>
                          {cart.recoveryIncentiveCode && (
                            <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                              Bonus Code: {cart.recoveryIncentiveCode}
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-neutral-500">
                          Saved {new Date(cart.abandonedAt || cart.updatedAt).toLocaleString()} · {cart.itemCount}{' '}
                          {cart.itemCount === 1 ? 'item' : 'items'} · Reminders emailed: {cart.reminderCount}/3
                        </p>
                      </div>

                      <div className="text-left sm:text-right">
                        <span className="text-[10px] uppercase font-bold text-neutral-400 block">
                          Estimated Total
                        </span>
                        <span className="font-mono font-black text-base text-neutral-900">
                          {formatZAR(cart.estimatedTotalCents)}
                        </span>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {cart.items.map((item, idx) => (
                        <div
                          key={`${cart.id}-${item.sku}-${idx}`}
                          className="flex items-center gap-3 p-2.5 rounded-xl bg-neutral-50 border border-neutral-200"
                        >
                          <img
                            src={item.image}
                            alt={item.name}
                            className="w-12 h-12 rounded-lg object-cover border border-neutral-200 bg-white shrink-0"
                          />
                          <div className="min-w-0 flex-1">
                            <p className="text-xs font-bold text-neutral-900 truncate">{item.name}</p>
                            <p className="text-[11px] text-neutral-500">
                              Qty: {item.quantity} · <span className="font-mono">{formatZAR(item.unitPriceCents)}</span>
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>

                    <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-neutral-100">
                      <span className="text-[11px] font-mono text-neutral-400 truncate max-w-xs">
                        Recovery Token: {cart.recoveryToken}
                      </span>

                      <div className="flex flex-wrap items-center gap-2">
                        <button
                          type="button"
                          disabled={busyCartId === cart.id}
                          onClick={() => handleRestoreSavedCart(cart.recoveryToken, cart.id)}
                          className="px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                        >
                          <ShoppingBag className="w-3.5 h-3.5" />
                          <span>Restore to Cart</span>
                        </button>

                        <button
                          type="button"
                          disabled={busyCartId === cart.id || cart.reminderCount >= 3}
                          onClick={() => handleEmailCartLink(cart.id)}
                          className="px-3.5 py-2 bg-neutral-100 hover:bg-neutral-200 text-neutral-800 rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                        >
                          <Mail className="w-3.5 h-3.5 text-orange-600" />
                          <span>Email Recovery Link</span>
                        </button>

                        <button
                          type="button"
                          disabled={busyCartId === cart.id}
                          onClick={() => handleDismissSavedCart(cart.id)}
                          className="px-3 py-2 text-xs font-bold text-neutral-500 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-colors flex items-center gap-1 cursor-pointer disabled:opacity-50"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>Dismiss</span>
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

      </div>

      {/* Tax Invoice Modal */}
      {selectedInvoiceOrder && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-neutral-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-neutral-200 space-y-4 text-xs">
            <div className="flex items-center justify-between pb-3 border-b border-neutral-200">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-orange-600" />
                <h3 className="font-bold text-sm text-neutral-900">Official South African Tax Invoice</h3>
              </div>
              <button
                onClick={() => setSelectedInvoiceOrder(null)}
                className="p-1 rounded hover:bg-neutral-100 cursor-pointer text-neutral-500"
              >
                ✕
              </button>
            </div>

            <div className="bg-neutral-50 p-3 rounded-xl border border-neutral-200 space-y-1 text-[11px]">
              <p><strong>Supplier:</strong> Mevo Tech (Pty) Ltd</p>
              <p><strong>VAT Reg No:</strong> 4820199201</p>
              <p><strong>Sandton Depot:</strong> 5th Floor, Sandton City Office Tower, Johannesburg</p>
              <p><strong>Invoice / Ref:</strong> {selectedInvoiceOrder.reference}</p>
              <p><strong>Date:</strong> {new Date(selectedInvoiceOrder.createdAt).toLocaleDateString()}</p>
            </div>

            <div className="divide-y divide-neutral-100">
              {selectedInvoiceOrder.items.map((item, i) => (
                <div key={i} className="py-2 flex justify-between">
                  <span>{item.quantity}x {item.name}</span>
                  <span className="font-mono font-bold">{formatZAR(item.totalCents)}</span>
                </div>
              ))}
            </div>

            <div className="pt-2 border-t border-neutral-200 space-y-1 text-right">
              <p>Subtotal: <span className="font-mono">{formatZAR(selectedInvoiceOrder.subtotalCents)}</span></p>
              <p>15% South African VAT: <span className="font-mono">{formatZAR(selectedInvoiceOrder.taxCents)}</span></p>
              <p className="text-sm font-black text-neutral-900">
                Total Paid: <span className="font-mono">{formatZAR(selectedInvoiceOrder.totalCents)}</span>
              </p>
            </div>

            <button
              onClick={() => setSelectedInvoiceOrder(null)}
              className="w-full py-2 bg-neutral-900 hover:bg-neutral-800 text-white font-bold rounded-xl text-xs cursor-pointer"
            >
              Close Invoice
            </button>
          </div>
        </div>
      )}

      {/* Review Modal */}
      {reviewProduct && (
        <ReviewModal
          product={reviewProduct}
          isOpen={true}
          onClose={() => setReviewProduct(null)}
          isVerifiedBuyer={true}
          onReviewSubmitted={(newRev) => {
            alert(`Review submitted! Thank you for rating "${reviewProduct.name}".`);
            setReviewProduct(null);
          }}
        />
      )}

      {/* Share Modal */}
      {shareProduct && (
        <ShareModal
          product={shareProduct}
          isOpen={true}
          onClose={() => setShareProduct(null)}
        />
      )}
    </div>
  );
};
