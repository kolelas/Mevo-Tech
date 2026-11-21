import React, { useState } from 'react';
import { Activity, Bell, Box, Boxes, ChartNoAxesCombined, Check, ClipboardList, CreditCard, Headphones, House, Menu, Package, Settings, Shield, ShoppingBag, ShoppingCart, Tag, Users, Zap, CircleDollarSign, ArrowRight, Search, X } from 'lucide-react';

type Theme = 'dark' | 'light';
const navigation = [
  ['Dashboard', House], ['Orders', ClipboardList], ['Customers', Users], ['Products', Package],
  ['Inventory', Boxes], ['Payments', CreditCard], ['Support Tickets', Headphones],
  ['Promotions', Tag], ['Reports', ChartNoAxesCombined], ['Settings', Settings],
  ['Staff Management', Users], ['Security & Access', Shield], ['Audit Logs', ClipboardList]
] as const;

const orders = [
  ['#MT-20261122-001','Thabo Mthembu','$299.99','Paid','2m ago'],
  ['#MT-20261122-002','Lerato Dlamini','$149.50','Processing','5m ago'],
  ['#MT-20261122-003','Sipho Nkosi','$599.00','Shipped','8m ago'],
  ['#MT-20261122-004','Nokuthula Zulu','$249.99','Pending','12m ago'],
  ['#MT-20261122-005','David Mokoena','$129.99','Paid','15m ago']
];

function Spark({ color }: {color:string}) {
  return <svg viewBox="0 0 120 38" className="h-10 w-28"><polyline points="2,30 16,21 27,26 39,14 51,22 64,8 77,18 90,12 103,4 118,10" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round"/></svg>;
}
function Metric({title,value,change,tone,Icon,color}:{title:string;value:string;change:string;tone:string;Icon:React.ElementType;color:string}) {
  return <div className={'metric metric-'+tone+' rounded-2xl border p-4 sm:p-5 flex justify-between items-end min-h-[142px]'}><div><div className="flex items-center gap-3 text-sm font-semibold"><Icon size={34}/>{title}</div><div className="text-3xl font-black mt-2">{value}</div><div className="text-sm font-bold text-emerald-500 mt-1">↑ {change}</div><div className="text-[11px] opacity-70">vs last month</div></div><Spark color={color}/></div>;
}
function Chart() {
  return <svg viewBox="0 0 680 250" className="w-full h-[245px]"><defs><linearGradient id="mevoSales" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stopColor="#a855f7" stopOpacity=".35"/><stop offset="1" stopColor="#a855f7" stopOpacity="0"/></linearGradient></defs>{[24,82,140,198].map(y=><line key={y} x1="42" y1={y} x2="665" y2={y} stroke="currentColor" opacity=".13"/>)}<path d="M42 122 L72 116 102 111 132 130 162 91 192 94 222 111 252 91 282 88 312 76 342 96 372 109 402 88 432 72 462 63 492 82 522 70 552 76 582 94 612 72 642 75 665 58 L665 198 42 198Z" fill="url(#mevoSales)"/><polyline points="42,122 72,116 102,111 132,130 162,91 192,94 222,111 252,91 282,88 312,76 342,96 372,109 402,88 432,72 462,63 492,82 522,70 552,76 582,94 612,72 642,75 665,58" fill="none" stroke="#a855f7" strokeWidth="3"/><polyline points="42,148 72,140 102,142 132,154 162,131 192,130 222,142 252,128 282,126 312,116 342,132 372,144 402,130 432,116 462,110 492,124 522,113 552,117 582,132 612,117 642,110 665,96" fill="none" stroke="#0ea5e9" strokeWidth="3"/>{['Oct 25','Oct 31','Nov 06','Nov 12','Nov 18','Nov 22'].map((v,i)=><text key={v} x={42+i*124} y="228" fill="currentColor" fontSize="12" textAnchor="middle">{v}</text>)}</svg>;
}

export default function AdminControlCentre() {
  const [theme,setTheme]=useState<Theme>('dark');
  const [section,setSection]=useState('Dashboard');
  const [mobile,setMobile]=useState(false);
  const [search,setSearch]=useState('');
  const [notice,setNotice]=useState('');
  const dark=theme==='dark';
  const visibleOrders=orders.filter(r=>r.join(' ').toLowerCase().includes(search.toLowerCase()));
  return <div className={dark?'mevo-admin dark-mode':'mevo-admin light-mode'}>
    <style>{`
      .mevo-admin{min-height:100vh;display:flex;background:var(--page);color:var(--ink);--muted:var(--muted);font-family:Inter,ui-sans-serif,system-ui}
      .dark-mode{--page:#080713;--side:#100b20;--panel:rgba(20,15,39,.86);--ink:#faf8ff;--muted:#aaa4c2;--line:rgba(168,85,247,.32);--soft:rgba(255,255,255,.045);--shadow:0 12px 34px rgba(0,0,0,.3);color-scheme:dark}
      .light-mode{--page:#f4f6ff;--side:rgba(255,255,255,.88);--panel:rgba(255,255,255,.78);--ink:#171332;--muted:#625d7c;--line:rgba(124,58,237,.23);--soft:rgba(124,58,237,.055);--shadow:0 12px 34px rgba(87,72,160,.13);color-scheme:light;background:radial-gradient(ellipse at 60% 0%,rgba(147,197,253,.32),transparent 45%),radial-gradient(ellipse at 0% 65%,rgba(216,180,254,.3),transparent 42%),var(--page)}
      .mevo-side{background:var(--side);border-color:var(--line);backdrop-filter:blur(24px)}
      .mevo-panel{background:var(--panel);border:1px solid var(--line);box-shadow:var(--shadow);backdrop-filter:blur(22px)}
      .mevo-muted{color:var(--muted)}.mevo-soft{background:var(--soft)}
      .metric{box-shadow:0 0 22px var(--glow),var(--shadow);backdrop-filter:blur(20px)}
      .metric-purple{--glow:rgba(168,85,247,.3);border-color:#9333ea;background:linear-gradient(115deg,rgba(126,34,206,.25),rgba(168,85,247,.12));color:var(--ink)}
      .metric-blue{--glow:rgba(14,165,233,.3);border-color:#0284c7;background:linear-gradient(115deg,rgba(3,105,161,.24),rgba(14,165,233,.12))}
      .metric-green{--glow:rgba(16,185,129,.3);border-color:#059669;background:linear-gradient(115deg,rgba(5,150,105,.23),rgba(16,185,129,.12))}
      .metric-orange{--glow:rgba(245,158,11,.3);border-color:#d97706;background:linear-gradient(115deg,rgba(217,119,6,.23),rgba(245,158,11,.12))}
      .light-mode .metric{background-color:rgba(255,255,255,.62);box-shadow:0 0 22px var(--glow),0 10px 28px rgba(93,77,167,.14)}
      .mevo-nav-active{background:linear-gradient(110deg,#8616e8,#4f46e5);color:white;box-shadow:0 0 22px rgba(168,85,247,.42)}
      .mevo-row{border-top:1px solid var(--line)}.mevo-button{border:1px solid var(--line);background:var(--soft)}
      .mevo-admin button{cursor:pointer}
    `}</style>
    <aside className="mevo-side hidden lg:flex w-[292px] shrink-0 flex-col border-r">
      <div className="h-[94px] px-6 flex items-center gap-3 border-b" style={{borderColor:'var(--line)'}}><div className="text-6xl font-black italic bg-gradient-to-br from-fuchsia-600 via-violet-600 to-blue-500 bg-clip-text text-transparent">M</div><div><div className="text-[22px] font-black">MEVO TECH</div><div className="text-[11px] mevo-muted">Innovate · Trade · Grow</div></div></div>
      <div className="px-7 py-7 flex items-center gap-4"><div className="h-[76px] w-[76px] rounded-full border-2 border-violet-400 bg-gradient-to-br from-violet-600 to-sky-400 flex items-center justify-center text-2xl font-black text-white">MT</div><div><div className="font-bold">Mevo Administrator</div><div className="mt-1 rounded-full px-3 py-1 text-xs inline-block bg-violet-500/15 text-violet-500">Administrator</div><div className="mt-1 flex items-center gap-2 text-xs text-emerald-500"><span className="h-2 w-2 rounded-full bg-emerald-500"/>Online</div></div></div>
      <nav className="px-4 pb-4 space-y-1 flex-1">{navigation.map(([label,Icon])=><button key={label} onClick={()=>setSection(label)} className={'w-full h-[51px] px-3 rounded-xl flex items-center gap-4 text-left text-sm '+(section===label?'mevo-nav-active':'hover:bg-violet-500/10')}><Icon size={23}/>{label}{label==='Orders'&&<span className="ml-auto rounded-full bg-rose-600 text-white text-xs px-2 py-1">12</span>}{label==='Support Tickets'&&<span className="ml-auto rounded-full bg-rose-600 text-white text-xs px-2 py-1">8</span>}</button>)}</nav>
      <div className="p-5 border-t" style={{borderColor:'var(--line)'}}><button onClick={()=>setNotice('Storefront preview action.')} className="w-full rounded-xl py-4 text-sm font-bold text-white bg-gradient-to-r from-violet-700 via-purple-600 to-blue-600">View Storefront ↗</button></div>
    </aside>
    {mobile&&<div className="fixed inset-0 z-50 bg-black/50 lg:hidden" onClick={()=>setMobile(false)}><div className="mevo-side h-full w-72 p-5" onClick={e=>e.stopPropagation()}><button onClick={()=>setMobile(false)} className="mb-4"><X/></button>{navigation.map(([label,Icon])=><button key={label} onClick={()=>{setSection(label);setMobile(false)}} className="w-full p-3 flex gap-3"><Icon size={18}/>{label}</button>)}</div></div>}
    <main className="min-w-0 flex-1">
      <header className="sticky top-0 z-30 border-b backdrop-blur-2xl" style={{background:'var(--panel)',borderColor:'var(--line)'}}><div className="min-h-[94px] px-4 sm:px-7 flex items-center justify-between gap-3"><div className="flex items-center gap-4"><button className="lg:hidden mevo-button rounded-lg p-2" onClick={()=>setMobile(true)}><Menu/></button><div><h1 className="text-xl sm:text-[26px] font-extrabold">Admin Control Centre</h1><p className="text-sm mevo-muted">Manage your business with confidence</p></div></div><div className="flex items-center gap-2 sm:gap-4"><span className="hidden xl:flex items-center gap-2 rounded-full border border-emerald-500/50 px-4 py-2 text-xs font-bold text-emerald-500"><i className="h-2 w-2 rounded-full bg-emerald-500"/>System Online</span><span className="hidden 2xl:block text-xs mevo-muted">22 Nov 2026 · SAST</span><button className="relative p-2" aria-label="Notifications"><Bell/><i className="absolute right-0 top-0 h-4 w-4 rounded-full bg-rose-600 text-white text-[10px] not-italic">3</i></button><div className="hidden sm:flex rounded-full p-1 border" style={{borderColor:'var(--line)',background:'var(--soft)'}}><button onClick={()=>setTheme('dark')} className={'rounded-full px-3 py-2 text-xs '+(dark?'bg-violet-600 text-white':'mevo-muted')}>☾ Dark Mode</button><button onClick={()=>setTheme('light')} className={'rounded-full px-3 py-2 text-xs '+(!dark?'bg-violet-600 text-white':'mevo-muted')}>☼ White Mode</button></div><button onClick={()=>setNotice('Visual preview mode — sign out is not connected.')} className="rounded-xl border border-violet-500/40 px-3 sm:px-5 py-2.5 text-xs sm:text-sm">Logout</button></div></div><div className="sm:hidden flex justify-end px-4 pb-3"><button onClick={()=>setTheme(dark?'light':'dark')} className="mevo-button rounded-full px-3 py-2 text-xs">{dark?'☼ Switch to White Mode':'☾ Switch to Dark Mode'}</button></div></header>
      <div className="max-w-[1800px] mx-auto p-4 sm:p-6 space-y-5">
        {notice&&<div className="mevo-panel rounded-xl p-3 text-sm flex justify-between">{notice}<button onClick={()=>setNotice('')}><X size={16}/></button></div>}
        {section!=='Dashboard'&&<div className="mevo-panel rounded-xl p-4"><b className="text-violet-500">{section}</b><span className="mevo-muted text-sm ml-3">Visual preview module · data integration will be connected later.</span></div>}
        <section className="grid grid-cols-1 sm:grid-cols-2 2xl:grid-cols-4 gap-4">
          <Metric title="Total Sales" value="$48,750.32" change="12.5%" tone="purple" Icon={ShoppingCart} color="#c084fc"/>
          <Metric title="Total Orders" value="342" change="8.7%" tone="blue" Icon={Box} color="#38bdf8"/>
          <Metric title="Total Customers" value="2,847" change="15.2%" tone="green" Icon={Users} color="#34d399"/>
          <Metric title="Conversion Rate" value="3.8%" change="0.4%" tone="orange" Icon={CircleDollarSign} color="#fbbf24"/>
        </section>
        <section className="grid grid-cols-1 2xl:grid-cols-12 gap-4">
          <div className="mevo-panel rounded-2xl p-4 sm:p-5 2xl:col-span-7"><div className="flex justify-between items-center border-b pb-3" style={{borderColor:'var(--line)'}}><h2 className="font-extrabold text-lg flex gap-3 items-center"><ChartNoAxesCombined className="text-fuchsia-500" size={27}/>Sales Overview</h2><select className="mevo-button rounded-xl px-3 py-2 text-xs"><option>Last 30 Days</option><option>Last 7 Days</option><option>Last 90 Days</option></select></div><div className="flex justify-end gap-5 text-xs mt-3"><span>🟣 Sales</span><span>🔵 Orders</span></div><Chart/></div>
          <div className="mevo-panel rounded-2xl p-4 sm:p-5 2xl:col-span-5 min-w-0"><div className="flex items-center justify-between border-b pb-3" style={{borderColor:'var(--line)'}}><h2 className="font-extrabold text-lg flex items-center gap-3"><ShoppingCart className="text-fuchsia-500" size={27}/>Recent Orders</h2><button onClick={()=>setSection('Orders')} className="text-fuchsia-500 text-sm font-bold">View All →</button></div><div className="flex items-center gap-2 py-3"><Search size={15}/><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search orders..." className="bg-transparent outline-none text-xs w-full"/></div>{visibleOrders.map(row=><div key={row[0]} className="mevo-row min-h-[55px] py-2 grid grid-cols-[24px_minmax(0,1fr)_auto] sm:grid-cols-[24px_minmax(0,1fr)_auto_auto] gap-2 items-center text-xs"><ShoppingCart size={20} className="mevo-muted"/><div className="min-w-0"><b className="block truncate">{row[0]}</b><span className="mevo-muted">{row[1]}</span></div><b>{row[2]}</b><div className="hidden sm:block text-right"><span className="rounded-full px-3 py-1 bg-emerald-500/15 text-emerald-500">{row[3]}</span><div className="mevo-muted mt-1">{row[4]}</div></div></div>)}</div>
        </section>
        <section className="grid grid-cols-1 xl:grid-cols-3 gap-4">
          <div className="mevo-panel rounded-2xl p-4 sm:p-5"><h2 className="font-extrabold text-lg mb-5">🏆 Top Products <button onClick={()=>setSection('Products')} className="float-right text-fuchsia-500 text-sm">View All →</button></h2>{[['Mevo Pro Trading EA','$12,499.00','248 sold','84%'],['Mevo AI Analyzer','$8,999.00','187 sold','61%'],['Mevo VPS Service','$6,999.00','142 sold','48%']].map((p,i)=><div key={p[0]} className="flex gap-3 items-center mb-4"><b className="mevo-muted">{i+1}</b><div className="h-12 w-12 rounded-xl bg-gradient-to-br from-violet-600 to-fuchsia-500 flex items-center justify-center text-white"><Package/></div><div className="min-w-0 flex-1"><b className="text-sm">{p[0]}</b><div className="h-2 rounded-full bg-violet-500/15 mt-2"><div className="h-2 rounded-full bg-gradient-to-r from-violet-600 to-fuchsia-500" style={{width:p[3]}}/></div><small className="mevo-muted">{p[2]}</small></div><b className="text-xs">{p[1]}</b></div>)}</div>
          <div className="mevo-panel rounded-2xl p-4 sm:p-5"><h2 className="font-extrabold text-lg mb-5 flex gap-3"><ShieldCheck className="text-emerald-500"/>System Health</h2><div className="flex gap-4 items-center"><div className="h-32 w-32 rounded-full p-2 shrink-0" style={{background:'conic-gradient(#10b981 0 98.5%,rgba(16,185,129,.15) 98.5% 100%)'}}><div className="h-full rounded-full flex flex-col items-center justify-center" style={{background:'var(--panel)'}}><b className="text-2xl">98.5%</b><span className="text-xs text-emerald-500 font-bold">Healthy</span></div></div><div className="space-y-3 text-xs">{['Database Online','Payments Active','API Responsive','Server Uptime 99.9%','Last Check 2 min ago'].map(v=><div key={v} className="flex gap-2 items-center"><Check size={16} className="text-emerald-500"/>{v}</div>)}</div></div><div className="mt-4 rounded-xl border border-emerald-500/50 bg-emerald-500/10 py-2.5 text-center text-sm font-bold text-emerald-500"><Check className="inline mr-2"/>All systems operational</div></div>
          <div className="mevo-panel rounded-2xl p-4 sm:p-5"><h2 className="font-extrabold text-lg mb-4 flex gap-3"><Zap className="text-fuchsia-500"/>Quick Actions</h2><div className="grid grid-cols-2 sm:grid-cols-4 xl:grid-cols-2 2xl:grid-cols-4 gap-2">{[[Box,'Add Product','Products'],[ShoppingCart,'Manage Orders','Orders'],[Users,'View Customers','Customers'],[Tag,'Create Promo','Promotions'],[ChartNoAxesCombined,'Generate Report','Reports'],[Headphones,'Support Tickets','Support Tickets'],[Users,'Manage Staff','Staff Management'],[Settings,'System Settings','Settings']].map(([Icon,label,target]:any)=><button key={label} onClick={()=>setSection(target)} className="mevo-button rounded-xl min-h-[82px] p-2 flex flex-col items-center justify-center gap-2 hover:border-fuchsia-500/70"><Icon className="text-violet-500" size={25}/><span className="text-[11px] font-bold text-center">{label}</span></button>)}</div></div>
        </section>
        <footer className="flex justify-between text-[10px] mevo-muted px-1"><span>MEVO TECH · ADMIN CONTROL CENTRE</span><span>Visual preview · Sample dashboard data</span></footer>
      </div>
    </main>
  </div>;
}
