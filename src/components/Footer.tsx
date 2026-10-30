import React from 'react';
import { ShieldCheck, Truck, Clock, CreditCard, Lock } from 'lucide-react';

interface FooterProps {
  onNavigate: (view: string) => void;
}

export const Footer: React.FC<FooterProps> = ({ onNavigate }) => {
  return (
    <footer className="bg-neutral-900 text-neutral-300 pt-16 pb-12 border-t border-neutral-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Trust Badges Strip */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 pb-12 border-b border-neutral-800">
          <div className="flex items-start gap-3.5">
            <div className="p-2.5 rounded-lg bg-neutral-800 text-purple-400 shrink-0">
              <Truck className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-sm font-semibold text-white">Fast Nationwide Delivery</h4>
              <p className="text-xs text-neutral-400 mt-0.5">Free courier on orders over R 1,500 via The Courier Guy.</p>
            </div>
          </div>

          <div className="flex items-start gap-3.5">
            <div className="p-2.5 rounded-lg bg-neutral-800 text-emerald-400 shrink-0">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-sm font-semibold text-white">100% Verified Local Stock</h4>
              <p className="text-xs text-neutral-400 mt-0.5">Official manufacturer warranties honored directly in South Africa.</p>
            </div>
          </div>

          <div className="flex items-start gap-3.5">
            <div className="p-2.5 rounded-lg bg-neutral-800 text-purple-400 shrink-0">
              <CreditCard className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-sm font-semibold text-white">Secure Flexible Payments</h4>
              <p className="text-xs text-neutral-400 mt-0.5">PayFast, Payflex 4x BNPL, Ozow Instant EFT, Paystack, and Crypto.</p>
            </div>
          </div>

          <div className="flex items-start gap-3.5">
            <div className="p-2.5 rounded-lg bg-neutral-800 text-amber-400 shrink-0">
              <Lock className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-sm font-semibold text-white">POPIA & CPA Compliant</h4>
              <p className="text-xs text-neutral-400 mt-0.5">Consumer Protection Act guarantees with 14-day hassle-free returns.</p>
            </div>
          </div>
        </div>

        {/* Links Grid */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-8 py-12 border-b border-neutral-800">
          <div className="col-span-2">
            <div className="flex items-center gap-4 mb-4">
              <div className="rounded-xl bg-neutral-950 p-1 shadow-md border border-neutral-800 shrink-0">
                <img
                  src="/assets/aistudio/Generated_Image_October_29__2026_-_8_40PM_f8f1a10b.png"
                  alt="MEVO TECH 3D Emblem"
                  className="h-12 w-auto max-w-[110px] object-cover rounded-lg"
                />
              </div>
              <div className="flex flex-col items-center justify-center">
                <img
                  src="/assets/aistudio/mevo_wordmark_dark.png"
                  alt="MEVO TECH — ONLINE TECH AND COMPUTER STORE"
                  className="h-12 sm:h-14 w-auto object-contain"
                />
              </div>
            </div>
            <p className="text-xs text-neutral-400 leading-relaxed max-w-sm mb-4">
              Mevo Tech (Pty) Ltd is South Africa’s premier direct-to-consumer technology retailer. We purchase, warehouse, and dispatch our own hardware directly from our Sandton depot.
            </p>
            <div className="text-xs text-neutral-400 space-y-1">
              <p><strong className="text-neutral-300">Sandton Hub:</strong> 5th Floor, Sandton City Office Tower, Johannesburg, 2196</p>
              <p><strong className="text-neutral-300">Support Line:</strong> +27 11 884 9200 (Mon–Fri 08:00–17:00 SAST)</p>
              <p><strong className="text-neutral-300">Email:</strong> support@mevotech.co.za</p>
              <p><strong className="text-neutral-300">VAT Reg:</strong> 4890291823 (All prices include 15% South African VAT)</p>
            </div>
          </div>

          <div>
            <h5 className="text-xs font-bold text-white uppercase tracking-wider mb-3">Shop Categories</h5>
            <ul className="text-xs text-neutral-400 space-y-2">
              <li><button onClick={() => onNavigate('category_laptops-notebooks')} className="hover:text-purple-400 hover:drop-shadow-[0_0_8px_rgba(168,85,247,0.7)] transition-all">Laptops & Workstations</button></li>
              <li><button onClick={() => onNavigate('category_monitors-displays')} className="hover:text-purple-400 hover:drop-shadow-[0_0_8px_rgba(168,85,247,0.7)] transition-all">Curved OLED Displays</button></li>
              <li><button onClick={() => onNavigate('category_desktops-workstations')} className="hover:text-purple-400 hover:drop-shadow-[0_0_8px_rgba(168,85,247,0.7)] transition-all">Custom Desktop Rigs</button></li>
              <li><button onClick={() => onNavigate('category_audio-peripherals')} className="hover:text-purple-400 hover:drop-shadow-[0_0_8px_rgba(168,85,247,0.7)] transition-all">Audiophile Headsets</button></li>
              <li><button onClick={() => onNavigate('category_storage-devices')} className="hover:text-purple-400 hover:drop-shadow-[0_0_8px_rgba(168,85,247,0.7)] transition-all">Gen5 NVMe Storage</button></li>
              <li><button onClick={() => onNavigate('category_networking-smart-home')} className="hover:text-purple-400 hover:drop-shadow-[0_0_8px_rgba(168,85,247,0.7)] transition-all">WiFi 7 Mesh Networking</button></li>
              <li><button onClick={() => onNavigate('categories_hub')} className="text-purple-400 font-semibold hover:text-purple-300 hover:drop-shadow-[0_0_8px_rgba(168,85,247,0.8)] transition-all">All Departments Hub →</button></li>
            </ul>
          </div>

          <div>
            <h5 className="text-xs font-bold text-white uppercase tracking-wider mb-3">Customer Support</h5>
            <ul className="text-xs text-neutral-400 space-y-2">
              <li><button onClick={() => onNavigate('account')} className="text-purple-400 font-bold hover:text-purple-300 hover:drop-shadow-[0_0_8px_rgba(168,85,247,0.7)] transition-all">Customer Account Hub</button></li>
              <li><button onClick={() => onNavigate('account_orders')} className="hover:text-purple-400 hover:drop-shadow-[0_0_8px_rgba(168,85,247,0.7)] transition-all">Track Order Deliveries</button></li>
              <li><button onClick={() => onNavigate('account_bought')} className="hover:text-purple-400 hover:drop-shadow-[0_0_8px_rgba(168,85,247,0.7)] transition-all">Bought Tech & Reviews</button></li>
              <li><button onClick={() => onNavigate('info_shipping')} className="hover:text-purple-400 hover:drop-shadow-[0_0_8px_rgba(168,85,247,0.7)] transition-all">Shipping & Courier Rates</button></li>
              <li><button onClick={() => onNavigate('info_returns')} className="hover:text-purple-400 hover:drop-shadow-[0_0_8px_rgba(168,85,247,0.7)] transition-all">Returns & Refunds</button></li>
              <li><button onClick={() => onNavigate('info_warranty')} className="hover:text-purple-400 hover:drop-shadow-[0_0_8px_rgba(168,85,247,0.7)] transition-all">Warranty Claim Process</button></li>
              <li><button onClick={() => onNavigate('info_contact')} className="hover:text-purple-400 hover:drop-shadow-[0_0_8px_rgba(168,85,247,0.7)] transition-all">Contact Our Specialists</button></li>
            </ul>
          </div>

          <div>
            <h5 className="text-xs font-bold text-white uppercase tracking-wider mb-3">Legal & Compliance</h5>
            <ul className="text-xs text-neutral-400 space-y-2">
              <li><button onClick={() => onNavigate('info_privacy')} className="hover:text-purple-400 hover:drop-shadow-[0_0_8px_rgba(168,85,247,0.7)] transition-all">POPIA Privacy Notice</button></li>
              <li><button onClick={() => onNavigate('info_terms')} className="hover:text-purple-400 hover:drop-shadow-[0_0_8px_rgba(168,85,247,0.7)] transition-all">Terms of Sale</button></li>
              <li><button onClick={() => onNavigate('info_cpa')} className="hover:text-purple-400 hover:drop-shadow-[0_0_8px_rgba(168,85,247,0.7)] transition-all">Consumer Protection Act</button></li>
              <li><button onClick={() => onNavigate('admin')} className="text-purple-400 hover:text-purple-300 hover:drop-shadow-[0_0_8px_rgba(168,85,247,0.8)] transition-all">Admin Portal</button></li>
            </ul>
          </div>
        </div>

        {/* Bottom copyright & payment methods */}
        <div className="pt-8 flex flex-col md:flex-row items-center justify-between text-xs text-neutral-500 gap-4">
          <p>© {new Date().getFullYear()} Mevo Tech (Pty) Ltd. Reg No: 2024/091823/07. All rights reserved.</p>
          <div className="flex items-center gap-3 text-neutral-400 text-xs">
            <span className="font-medium text-neutral-300">Accepted Gateways:</span>
            <span>PayFast</span>
            <span>·</span>
            <span>Payflex BNPL</span>
            <span>·</span>
            <span>Ozow EFT</span>
            <span>·</span>
            <span>Paystack</span>
            <span>·</span>
            <span>Crypto (USDT/BTC)</span>
          </div>
        </div>
      </div>
    </footer>
  );
};
