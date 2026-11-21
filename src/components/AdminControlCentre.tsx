import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { onAuthStateChanged, signInWithPopup, signOut, type User } from 'firebase/auth';
import {
  Activity, AlertCircle, ArrowDownToLine, ArrowUpRight, Boxes, Check, ChevronRight,
  ClipboardList, CreditCard, Headset, LayoutDashboard, Loader2, LogOut, Package,
  RefreshCw, Search, ShieldCheck, ShieldAlert, ShoppingBag, Users, X
} from 'lucide-react';
import { auth, googleAuthProvider } from '../lib/firebase';

type AdminSession = {
  userId: string;
  email: string;
  role: string;
  permissions: string[];
};
type Row = Record<string, unknown>;
type Section = 'overview' | 'orders' | 'catalog' | 'inventory' | 'customers' | 'support' | 'payments' | 'audit' | 'team';

const NAV: Array<{ id: Section; label: string; icon: React.ElementType; permission?: string }> = [
  { id: 'overview', label: 'Overview', icon: LayoutDashboard },
  { id: 'orders', label: 'Orders', icon: ShoppingBag, permission: 'orders.read' },
  { id: 'catalog', label: 'Product catalogue', icon: Package, permission: 'catalog.read' },
  { id: 'inventory', label: 'Inventory', icon: Boxes, permission: 'inventory.read' },
  { id: 'customers', label: 'Customers', icon: Users, permission: 'customers.read' },
  { id: 'support', label: 'Support desk', icon: Headset, permission: 'customers.support' },
  { id: 'payments', label: 'Payments', icon: CreditCard, permission: 'payments.read' },
  { id: 'audit', label: 'Audit trail', icon: ClipboardList, permission: 'audit.read' },
  { id: 'team', label: 'Team & access', icon: ShieldCheck, permission: 'admin.roles.manage' },
];

function money(value: unknown, currency = 'ZAR') {
  const n = Number(value ?? 0);
  return new Intl.NumberFormat('en-ZA', { style: 'currency', currency, maximumFractionDigits: 2 }).format(n / 100);
}
function date(value: unknown) {
  if (!value) return '—';
  const parsed = new Date(String(value));
  return Number.isNaN(parsed.getTime()) ? String(value) : parsed.toLocaleString('en-ZA');
}
function human(value: unknown) {
  return String(value ?? '—').replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}
function shortId(value: unknown) {
  const s = String(value ?? '');
  return s.length > 18 ? s.slice(0, 8) + '…' + s.slice(-6) : s || '—';
}

export function AdminControlCentre() {
  const [firebaseUser, setFirebaseUser] = useState<User | null>(null);
  const [session, setSession] = useState<AdminSession | null>(null);
  const [section, setSection] = useState<Section>('overview');
  const [data, setData] = useState<Row[]>([]);
  const [summary, setSummary] = useState<Row | null>(null);
  const [loading, setLoading] = useState(false);
  const [signingIn, setSigningIn] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [query, setQuery] = useState('');
  const [teamUserId, setTeamUserId] = useState('');
  const [teamEmail, setTeamEmail] = useState('');
  const [teamRole, setTeamRole] = useState('customer_support');

  const request = useCallback(async (path: string, init: RequestInit = {}) => {
    const current = auth.currentUser;
    if (!current) throw new Error('Sign in with an approved administrator account first.');
    const token = await current.getIdToken();
    const response = await fetch('/api/admin' + path, {
      ...init,
      headers: {
        Authorization: 'Bearer ' + token,
        ...(init.body ? { 'Content-Type': 'application/json' } : {}),
        ...(init.headers || {}),
      },
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok || result.success === false) {
      throw new Error(result.error || 'The administrator request failed (' + response.status + ').');
    }
    return result;
  }, []);

  const loadSession = useCallback(async (user: User) => {
    setLoading(true);
    setError('');
    try {
      const token = await user.getIdToken();
      const response = await fetch('/api/admin/session', { headers: { Authorization: 'Bearer ' + token } });
      const result = await response.json();
      if (!response.ok || !result.success) throw new Error(result.error || 'Administrator access was not granted.');
      setSession(result.administrator as AdminSession);
    } catch (e) {
      setSession(null);
      setError(e instanceof Error ? e.message : 'Could not verify administrator access.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => onAuthStateChanged(auth, (user) => {
    setFirebaseUser(user);
    if (user) void loadSession(user);
    else setSession(null);
  }), [loadSession]);

  const loadSection = useCallback(async (target: Section, searchText = search, filter = statusFilter) => {
    if (!session) return;
    setLoading(true);
    setError('');
    setNotice('');
    try {
      if (target === 'overview') {
        const permissions = session.permissions;
        const [inventoryResult, orderResult, productResult, supportResult] = await Promise.all([
          permissions.includes('inventory.read') ? request('/inventory/summary') : Promise.resolve(null),
          permissions.includes('orders.read') ? request('/orders?limit=8') : Promise.resolve(null),
          permissions.includes('catalog.read') ? request('/catalog/products?limit=8') : Promise.resolve(null),
          permissions.includes('customers.support') ? request('/support/cases?limit=8') : Promise.resolve(null),
        ]);
        setSummary(inventoryResult?.inventory || null);
        setData([
          ...((orderResult?.orders || []) as Row[]).map((r) => ({ ...r, _kind: 'order' })),
          ...((productResult?.products || []) as Row[]).map((r) => ({ ...r, _kind: 'product' })),
          ...((supportResult?.cases || []) as Row[]).map((r) => ({ ...r, _kind: 'case' })),
        ]);
      } else {
        const q = searchText ? '&search=' + encodeURIComponent(searchText) : '';
        const s = filter ? '&status=' + encodeURIComponent(filter) : '';
        const endpoints: Record<Exclude<Section, 'overview'>, string> = {
          orders: '/orders?limit=100' + s,
          catalog: '/catalog/products?limit=100' + q,
          inventory: '/inventory/movements?limit=100',
          customers: '/customers?limit=100' + q + s,
          support: '/support/cases?limit=100' + s,
          payments: '/payments/attempts?limit=100' + s,
          audit: '/audit/events?limit=100',
          team: '/session',
        };
        const result = await request(endpoints[target as Exclude<Section, 'overview'>]);
        if (target === 'inventory') setData((result.movements || []) as Row[]);
        else if (target === 'orders') setData((result.orders || []) as Row[]);
        else if (target === 'catalog') setData((result.products || []) as Row[]);
        else if (target === 'customers') setData((result.customers || []) as Row[]);
        else if (target === 'support') setData((result.cases || []) as Row[]);
        else if (target === 'payments') setData((result.attempts || []) as Row[]);
        else if (target === 'audit') setData((result.events || []) as Row[]);
        else setData([]);
      }
    } catch (e) {
      setData([]);
      setError(e instanceof Error ? e.message : 'Could not load this admin section.');
    } finally {
      setLoading(false);
    }
  }, [request, search, session, statusFilter]);

  useEffect(() => {
    if (session) void loadSection(section);
  }, [session, section, loadSection]);

  const allowedNav = useMemo(() => NAV.filter((item) => !item.permission || session?.permissions.includes(item.permission)), [session]);
  const selectSection = (id: Section) => {
    setSection(id);
    setSearch('');
    setStatusFilter('');
    setQuery('');
  };

  const runAction = async (action: () => Promise<unknown>, success: string) => {
    setLoading(true);
    setError('');
    setNotice('');
    try {
      await action();
      setNotice(success);
      await loadSection(section);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'The action could not be completed.');
    } finally {
      setLoading(false);
    }
  };

  const advanceOrder = (row: Row) => {
    const current = String(row.status || '').toUpperCase();
    const next = current === 'PAID' ? 'PROCESSING' : current === 'PROCESSING' ? 'SHIPPED' : current === 'SHIPPED' ? 'DELIVERED' : '';
    if (!next) return;
    let carrier = '';
    let trackingNumber = '';
    if (next === 'SHIPPED') {
      carrier = window.prompt('Courier / carrier name') || '';
      trackingNumber = window.prompt('Tracking number') || '';
      if (!carrier.trim() || !trackingNumber.trim()) return;
    }
    const reference = encodeURIComponent(String(row.reference || ''));
    void runAction(() => request('/orders/' + reference + '/fulfilment', {
      method: 'PATCH',
      body: JSON.stringify({ status: next, ...(next === 'SHIPPED' ? { carrier, trackingNumber } : {}) }),
    }), 'Order ' + String(row.reference) + ' updated to ' + next + '.');
  };

  const toggleProduct = (row: Row) => {
    void runAction(() => request('/catalog/products/' + encodeURIComponent(String(row.id)), {
      method: 'PATCH', body: JSON.stringify({ active: !row.active }),
    }), 'Product visibility updated.');
  };

  const adjustStock = (row: Row) => {
    const raw = window.prompt('Enter stock adjustment (positive to add, negative to remove).');
    if (raw === null) return;
    const quantity = Number(raw);
    if (!Number.isSafeInteger(quantity) || quantity === 0) {
      setError('Enter a non-zero whole number for the stock adjustment.');
      return;
    }
    const reference = window.prompt('Adjustment reference (optional)') || '';
    void runAction(() => request('/inventory/adjustments', {
      method: 'POST',
      body: JSON.stringify({ productId: String(row.product_id || row.id), quantity, reference }),
    }), 'Inventory adjustment recorded.');
  };

  const updateCase = (row: Row) => {
    const next = window.prompt('New status: open, in_progress, waiting_customer, resolved, closed', String(row.status || 'open'));
    if (!next || !['open', 'in_progress', 'waiting_customer', 'resolved', 'closed'].includes(next)) return;
    void runAction(() => request('/support/cases/' + encodeURIComponent(String(row.id)), {
      method: 'PATCH', body: JSON.stringify({ status: next }),
    }), 'Support case updated.');
  };

  const addAdmin = () => {
    void runAction(() => request('/roles', {
      method: 'POST',
      body: JSON.stringify({ userId: teamUserId.trim(), email: teamEmail.trim(), role: teamRole }),
    }), 'Administrator role granted.').then(() => {
      setTeamUserId('');
      setTeamEmail('');
    });
  };

  const signIn = async () => {
    setSigningIn(true);
    setError('');
    try {
      await signInWithPopup(auth, googleAuthProvider);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Google sign-in could not be completed.');
    } finally {
      setSigningIn(false);
    }
  };

  const columns: Record<Section, Array<{ key: string; label: string; render?: (row: Row) => React.ReactNode }>> = {
    overview: [],
    orders: [
      { key: 'reference', label: 'Order reference' },
      { key: 'customer_email', label: 'Customer' },
      { key: 'status', label: 'Status' },
      { key: 'total_cents', label: 'Total', render: (r) => money(r.total_cents, String(r.currency || 'ZAR')) },
      { key: 'created_at', label: 'Created', render: (r) => date(r.created_at) },
    ],
    catalog: [
      { key: 'sku', label: 'SKU' }, { key: 'name', label: 'Product' },
      { key: 'price_cents', label: 'Price', render: (r) => money(r.price_cents, String(r.currency || 'ZAR')) },
      { key: 'available_stock', label: 'Available', render: (r) => String(r.available_stock ?? Number(r.stock_on_hand || 0) - Number(r.stock_reserved || 0)) },
      { key: 'active', label: 'Visibility', render: (r) => r.active ? 'Active' : 'Hidden' },
    ],
    inventory: [
      { key: 'product_name', label: 'Product' }, { key: 'sku', label: 'SKU' },
      { key: 'movement_type', label: 'Movement' }, { key: 'quantity', label: 'Quantity' },
      { key: 'reference', label: 'Reference' }, { key: 'created_at', label: 'Date', render: (r) => date(r.created_at) },
    ],
    customers: [
      { key: 'display_name', label: 'Customer' }, { key: 'email', label: 'Email' },
      { key: 'status', label: 'Account status' }, { key: 'created_at', label: 'Joined', render: (r) => date(r.created_at) },
    ],
    support: [
      { key: 'subject', label: 'Case' }, { key: 'customer_email', label: 'Customer' },
      { key: 'priority', label: 'Priority' }, { key: 'status', label: 'Status' },
      { key: 'created_at', label: 'Opened', render: (r) => date(r.created_at) },
    ],
    payments: [
      { key: 'order_reference', label: 'Order' }, { key: 'provider', label: 'Provider' },
      { key: 'status', label: 'Status' }, { key: 'amount_cents', label: 'Amount', render: (r) => money(r.amount_cents, String(r.currency || 'ZAR')) },
      { key: 'created_at', label: 'Created', render: (r) => date(r.created_at) },
    ],
    audit: [
      { key: 'action', label: 'Action' }, { key: 'actor', label: 'Actor' },
      { key: 'target_type', label: 'Target' }, { key: 'target_id', label: 'Target ID' },
      { key: 'created_at', label: 'Timestamp', render: (r) => date(r.created_at) },
    ],
    team: [],
  };

  const title = NAV.find((n) => n.id === section)?.label || 'Overview';

  if (!session) {
    return <div className="min-h-screen bg-[#0b0912] text-white flex items-center justify-center p-5">
      <div className="w-full max-w-md rounded-3xl border border-violet-400/20 bg-[#151121] p-8 shadow-2xl shadow-violet-950/30">
        <div className="mb-8 flex items-center gap-3"><div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-violet-500 to-fuchsia-500 flex items-center justify-center"><ShieldCheck className="h-6 w-6"/></div><div><p className="text-xs uppercase tracking-[.25em] text-violet-300">MEVO TECH</p><h1 className="text-2xl font-bold">Admin Control Centre</h1></div></div>
        <p className="text-sm leading-6 text-slate-400 mb-6">Secure administrator access. Sign in with the Google account that has been granted an administrator role.</p>
        {error && <div className="mb-5 rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-sm text-rose-200 flex gap-2"><AlertCircle className="h-4 w-4 shrink-0 mt-0.5"/>{error}</div>}
        <button onClick={signIn} disabled={signingIn || loading} className="w-full rounded-xl bg-white px-4 py-3 text-sm font-bold text-slate-900 hover:bg-violet-100 disabled:opacity-60 flex justify-center items-center gap-2">{signingIn || loading ? <Loader2 className="h-4 w-4 animate-spin"/> : <ShieldCheck className="h-4 w-4"/>}Continue with Google</button>
        <p className="mt-5 text-center text-[11px] text-slate-500">Access is verified server-side. Customer accounts do not receive admin access.</p>
        {firebaseUser && <button onClick={() => void signOut(auth)} className="mt-4 w-full text-xs text-slate-400 hover:text-white">Sign out {firebaseUser.email}</button>}
      </div>
    </div>;
  }

  return <div className="min-h-screen bg-[#0b0912] text-slate-100 flex">
    <aside className="hidden lg:flex w-64 shrink-0 flex-col border-r border-violet-300/10 bg-[#100d1b]">
      <div className="h-20 px-6 flex items-center gap-3 border-b border-white/5"><div className="h-10 w-10 rounded-xl bg-gradient-to-br from-violet-500 to-fuchsia-500 flex items-center justify-center"><Activity className="h-5 w-5"/></div><div><div className="font-black tracking-wide">MEVO <span className="text-violet-300">TECH</span></div><div className="text-[10px] uppercase tracking-[.2em] text-slate-500">Control Centre</div></div></div>
      <nav className="p-3 space-y-1 flex-1">{allowedNav.map((item) => { const Icon = item.icon; return <button key={item.id} onClick={() => selectSection(item.id)} className={'w-full flex items-center gap-3 rounded-xl px-3 py-3 text-left text-sm transition ' + (section === item.id ? 'bg-violet-500/15 text-violet-200 border border-violet-400/20' : 'text-slate-400 hover:bg-white/5 hover:text-white')}><Icon className="h-4 w-4"/>{item.label}{section === item.id && <ChevronRight className="ml-auto h-4 w-4"/>}</button>; })}</nav>
      <div className="p-4 border-t border-white/5"><div className="text-xs text-slate-400 truncate">{session.email}</div><div className="text-[10px] text-violet-300 uppercase tracking-widest mt-1">{human(session.role)}</div><button onClick={() => void signOut(auth)} className="mt-4 flex items-center gap-2 text-xs text-slate-500 hover:text-white"><LogOut className="h-4 w-4"/>Sign out</button></div>
    </aside>
    <main className="min-w-0 flex-1">
      <header className="sticky top-0 z-20 border-b border-white/5 bg-[#0b0912]/90 backdrop-blur-xl">
        <div className="px-5 lg:px-8 h-20 flex items-center justify-between gap-4"><div><div className="text-[10px] uppercase tracking-[.24em] text-violet-300">Operations / {title}</div><h1 className="text-xl sm:text-2xl font-bold">{title}</h1></div><div className="flex items-center gap-2"><span className="hidden sm:inline-flex rounded-full border border-emerald-400/20 bg-emerald-400/10 px-3 py-1.5 text-[10px] uppercase tracking-wider text-emerald-300"><span className="mr-2 h-1.5 w-1.5 rounded-full bg-emerald-400"/>Authenticated</span><button onClick={() => void loadSection(section)} className="rounded-xl border border-white/10 p-2.5 text-slate-300 hover:bg-white/5" title="Refresh"><RefreshCw className={'h-4 w-4 ' + (loading ? 'animate-spin' : '')}/></button><button onClick={() => void signOut(auth)} className="lg:hidden rounded-xl border border-white/10 p-2.5"><LogOut className="h-4 w-4"/></button></div></div>
        <div className="lg:hidden flex gap-2 overflow-x-auto px-4 pb-3">{allowedNav.map((item) => <button key={item.id} onClick={() => selectSection(item.id)} className={'shrink-0 rounded-full px-3 py-2 text-xs ' + (section === item.id ? 'bg-violet-500 text-white' : 'bg-white/5 text-slate-400')}>{item.label}</button>)}</div>
      </header>
      <div className="p-5 lg:p-8 max-w-[1500px] mx-auto space-y-6">
        {error && <div className="rounded-xl border border-rose-500/20 bg-rose-500/10 px-4 py-3 text-sm text-rose-200 flex items-center gap-2"><AlertCircle className="h-4 w-4 shrink-0"/>{error}<button onClick={() => setError('')} className="ml-auto"><X className="h-4 w-4"/></button></div>}
        {notice && <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200 flex items-center gap-2"><Check className="h-4 w-4"/>{notice}<button onClick={() => setNotice('')} className="ml-auto"><X className="h-4 w-4"/></button></div>}
        {section === 'overview' && <>
          <div className="grid grid-cols-2 xl:grid-cols-4 gap-3">
            {[
              ['Products', summary?.product_count, Package],
              ['Active products', summary?.active_product_count, Boxes],
              ['Units available', summary?.units_available, ArrowUpRight],
              ['Out of stock', summary?.active_out_of_stock_count, AlertCircle],
            ].map(([label, value, Icon]: any) => <div key={label} className="rounded-2xl border border-white/8 bg-[#151121] p-5"><div className="flex items-center justify-between text-xs text-slate-400"><span>{label}</span><Icon className="h-4 w-4 text-violet-300"/></div><div className="mt-4 text-3xl font-bold tabular-nums">{value === undefined ? '—' : Number(value).toLocaleString('en-ZA')}</div><div className="mt-1 text-[10px] text-slate-500">PostgreSQL live data</div></div>)}
          </div>
          <div className="rounded-2xl border border-amber-400/20 bg-amber-400/5 p-4 flex gap-3 text-sm text-amber-100"><ShieldAlert className="h-5 w-5 shrink-0 text-amber-300"/><div><strong>Staging / foundation data</strong><p className="mt-1 text-xs leading-5 text-amber-100/70">These figures come from the new PostgreSQL commerce foundation. The legacy storefront catalogue and in-memory orders have not yet been migrated into it. Do not treat empty tables as proof that the store has no orders or products.</p></div></div>
          <div className="grid xl:grid-cols-2 gap-4">
            <div className="rounded-2xl border border-white/8 bg-[#151121] p-5"><h2 className="font-semibold mb-4">Operational snapshot</h2><div className="space-y-3 text-sm">{[['Stock on hand', summary?.units_on_hand],['Stock reserved',summary?.units_reserved],['Available units',summary?.units_available]].map(([l,v])=><div key={String(l)} className="flex justify-between border-b border-white/5 pb-3"><span className="text-slate-400">{l}</span><strong>{v === undefined ? '—' : Number(v).toLocaleString('en-ZA')}</strong></div>)}</div></div>
            <div className="rounded-2xl border border-white/8 bg-[#151121] p-5"><h2 className="font-semibold mb-4">Quick access</h2><div className="grid grid-cols-2 gap-2">{allowedNav.filter(n=>n.id!=='overview').slice(0,6).map(n=><button key={n.id} onClick={()=>selectSection(n.id)} className="rounded-xl border border-white/8 bg-white/[.03] p-3 text-left text-xs hover:border-violet-400/30 hover:bg-violet-400/5">{n.label}<ChevronRight className="float-right h-4 w-4 text-violet-300"/></button>)}</div></div>
          </div>
        </>}
        {section === 'team' && <div className="rounded-2xl border border-white/8 bg-[#151121] p-5 max-w-2xl"><h2 className="font-semibold">Grant administrator access</h2><p className="text-xs text-slate-400 mt-1 mb-5">Owner-only. Use the Firebase UID and verified email for the person being added.</p><div className="grid gap-3"><input value={teamUserId} onChange={e=>setTeamUserId(e.target.value)} placeholder="Firebase user UID" className="rounded-xl border border-white/10 bg-[#0d0a15] p-3 text-sm outline-none focus:border-violet-400"/><input value={teamEmail} onChange={e=>setTeamEmail(e.target.value)} placeholder="Verified email address" className="rounded-xl border border-white/10 bg-[#0d0a15] p-3 text-sm outline-none focus:border-violet-400"/><select value={teamRole} onChange={e=>setTeamRole(e.target.value)} className="rounded-xl border border-white/10 bg-[#0d0a15] p-3 text-sm"><option value="admin">Admin</option><option value="inventory_manager">Inventory manager</option><option value="fulfilment_manager">Fulfilment manager</option><option value="customer_support">Customer support</option></select><button disabled={!teamUserId.trim()||!teamEmail.trim()||loading} onClick={addAdmin} className="rounded-xl bg-violet-600 p-3 text-sm font-bold hover:bg-violet-500 disabled:opacity-40">Grant access</button></div></div>}
        {section !== 'overview' && section !== 'team' && <>
          <div className="flex flex-col sm:flex-row gap-3 justify-between"><div className="relative flex-1 max-w-md"><Search className="absolute left-3 top-3 h-4 w-4 text-slate-500"/><input value={search} onChange={e=>setSearch(e.target.value)} onKeyDown={e=>{if(e.key==='Enter')void loadSection(section,search,statusFilter)}} placeholder={section==='catalog'||section==='customers'?'Search records…':'Search is available for catalogue and customers'} className="w-full rounded-xl border border-white/10 bg-[#151121] py-2.5 pl-10 pr-3 text-sm outline-none focus:border-violet-400"/></div><div className="flex gap-2"><select value={statusFilter} onChange={e=>{setStatusFilter(e.target.value);void loadSection(section,search,e.target.value)}} className="rounded-xl border border-white/10 bg-[#151121] px-3 py-2 text-xs text-slate-300"><option value="">All statuses</option>{(section==='orders'?['PAID','PROCESSING','SHIPPED','DELIVERED','PENDING','CANCELLED']:section==='support'?['open','in_progress','waiting_customer','resolved','closed']:section==='customers'?['active','restricted','blocked']:section==='payments'?['pending','succeeded','failed']:[]).map(v=><option key={v} value={v}>{human(v)}</option>)}</select><button onClick={()=>void loadSection(section,search,statusFilter)} className="rounded-xl border border-white/10 px-3 py-2 text-xs text-slate-300 hover:bg-white/5">Apply</button></div></div>
          <div className="rounded-2xl border border-white/8 bg-[#151121] overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-white/5"><div><h2 className="font-semibold">{title}</h2><p className="text-[11px] text-slate-500 mt-1">{data.length} records returned · PostgreSQL</p></div><span className="text-[10px] uppercase tracking-widest text-slate-500">Live API</span></div>
            {loading ? <div className="p-12 text-center text-sm text-slate-400"><Loader2 className="h-5 w-5 animate-spin mx-auto mb-2"/>Loading records…</div> : data.length===0 ? <div className="p-12 text-center"><div className="mx-auto mb-3 h-12 w-12 rounded-2xl bg-violet-500/10 flex items-center justify-center"><ClipboardList className="h-5 w-5 text-violet-300"/></div><p className="text-sm font-semibold">No records available</p><p className="mt-1 text-xs text-slate-500">The database may be empty or not yet connected to the legacy store data.</p></div> : <div className="overflow-x-auto"><table className="w-full text-left text-xs min-w-[720px]"><thead className="bg-white/[.025] text-[10px] uppercase tracking-wider text-slate-500"><tr>{columns[section].map(c=><th key={c.key} className="px-5 py-3 font-semibold">{c.label}</th>)}<th className="px-5 py-3">Actions</th></tr></thead><tbody className="divide-y divide-white/5">{data.map((row,index)=><tr key={String(row.id||row.reference||index)} className="hover:bg-white/[.025]">{columns[section].map(c=><td key={c.key} className="px-5 py-4 text-slate-300 max-w-[260px] truncate">{c.render?c.render(row):human(row[c.key])}</td>)}<td className="px-5 py-3"><div className="flex gap-2">{section==='orders'&&['PAID','PROCESSING','SHIPPED'].includes(String(row.status).toUpperCase())&&session.permissions.includes('orders.fulfil')&&<button onClick={()=>advanceOrder(row)} className="rounded-lg bg-violet-500/15 px-2.5 py-1.5 text-[10px] text-violet-200 hover:bg-violet-500/25">Advance</button>}{section==='catalog'&&session.permissions.includes('catalog.write')&&<button onClick={()=>toggleProduct(row)} className="rounded-lg bg-violet-500/15 px-2.5 py-1.5 text-[10px] text-violet-200">{row.active?'Hide':'Activate'}</button>}{section==='inventory'&&session.permissions.includes('inventory.write')&&<button onClick={()=>adjustStock(row)} className="rounded-lg bg-violet-500/15 px-2.5 py-1.5 text-[10px] text-violet-200">Adjust stock</button>}{section==='support'&&<button onClick={()=>updateCase(row)} className="rounded-lg bg-violet-500/15 px-2.5 py-1.5 text-[10px] text-violet-200">Update case</button>}</div></td></tr>)}</tbody></table></div>}
          </div>
        </>}
        <footer className="flex flex-wrap items-center justify-between gap-3 text-[10px] text-slate-600"><span>MEVO TECH · ADMIN CONTROL CENTRE</span><span>Verified identity · Database-backed permissions · Audit logged actions</span></footer>
      </div>
    </main>
  </div>;
}

export default AdminControlCentre;
