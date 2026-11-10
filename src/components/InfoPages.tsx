import React from 'react';
import { Truck, ShieldCheck, Lock, FileText, Phone, Mail, MapPin } from 'lucide-react';

interface InfoPagesProps {
  page: string;
  onBackToStore: () => void;
}

export const InfoPages: React.FC<InfoPagesProps> = ({ page, onBackToStore }) => {
  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-12 animate-in fade-in">
      <button
        onClick={onBackToStore}
        className="text-xs font-semibold text-orange-600 hover:text-orange-800 mb-6 flex items-center gap-1"
      >
        ← Back to Storefront
      </button>

      {/* Shipping & Delivery Page */}
      {page === 'info_shipping' && (
        <div className="bg-white rounded-2xl border border-neutral-200 p-8 shadow-sm space-y-6">
          <div className="flex items-center gap-3 pb-4 border-b border-neutral-200">
            <div className="p-3 bg-orange-50 text-orange-600 rounded-xl">
              <Truck className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-neutral-900">South African Shipping & Delivery Information</h1>
              <p className="text-xs text-neutral-500">Door-to-door courier schedules from our Sandton warehouse</p>
            </div>
          </div>

          <div className="space-y-4 text-xs text-neutral-700 leading-relaxed">
            <h3 className="text-sm font-bold text-neutral-900">1. Delivery Zones & Delivery Windows</h3>
            <p>
              Mevo Tech partners with <strong>The Courier Guy</strong> and <strong>DPD Laser</strong> to provide door-to-door courier service across all 9 provinces in South Africa.
            </p>
            <ul className="list-disc pl-5 space-y-1.5">
              <li><strong>Gauteng (Johannesburg, Pretoria, Centurion):</strong> 1–2 business days.</li>
              <li><strong>Western Cape (Cape Town Metro) & KwaZulu-Natal (Durban Metro):</strong> 2–3 business days.</li>
              <li><strong>Regional and Outlying Areas (Eastern Cape, Free State, Limpopo, Mpumalanga, North West, Northern Cape):</strong> 3–5 business days.</li>
            </ul>

            <h3 className="text-sm font-bold text-neutral-900 pt-2">2. Delivery Pricing Structure</h3>
            <ul className="list-disc pl-5 space-y-1.5">
              <li><strong>Standard Door-to-Door Courier:</strong> R 150.00 nationwide.</li>
              <li><strong>Free Standard Delivery:</strong> Automatically applied to all orders with a cart subtotal of R 1,500.00 or more.</li>
              <li><strong>Express Overnight Priority:</strong> R 280.00 (dispatched via next-day air to major metropolitan hubs).</li>
            </ul>

            <h3 className="text-sm font-bold text-neutral-900 pt-2">3. Parcel Tracking & Insurance</h3>
            <p>
              Every parcel dispatched from Mevo Tech is fully insured against transit loss or damage and includes a real-time tracking waybill number sent to your phone and email.
            </p>
          </div>
        </div>
      )}

      {/* Warranty & Returns Page */}
      {page === 'info_warranty' && (
        <div className="bg-white rounded-2xl border border-neutral-200 p-8 shadow-sm space-y-6">
          <div className="flex items-center gap-3 pb-4 border-b border-neutral-200">
            <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-neutral-900">Warranty Policy & Consumer Protection Guarantees</h1>
              <p className="text-xs text-neutral-500">Official local South African manufacturer warranties</p>
            </div>
          </div>

          <div className="space-y-4 text-xs text-neutral-700 leading-relaxed">
            <h3 className="text-sm font-bold text-neutral-900">1. Local Manufacturer Warranties</h3>
            <p>
              Because Mevo Tech owns and manages its physical inventory in South Africa rather than dropshipping grey imports, every product includes an authentic, locally enforceable manufacturer warranty (12 to 36 months, depending on product specification).
            </p>

            <h3 className="text-sm font-bold text-neutral-900 pt-2">2. Consumer Protection Act (CPA) 68 of 2008 Compliance</h3>
            <p>
              In accordance with Section 56 of the South African Consumer Protection Act, all goods come with an implied warranty of quality for a period of six months from delivery. Within this window, if goods are defective, you are entitled to repair, replacement, or a full refund.
            </p>

            <h3 className="text-sm font-bold text-neutral-900 pt-2">3. 14-Day Cooling-off & Change of Mind</h3>
            <p>
              Unopened items in original sealed packaging may be returned within 14 calendar days of receipt for store credit or refund, less direct courier collection costs.
            </p>
          </div>
        </div>
      )}

      {/* Returns Page */}
      {page === 'info_returns' && (
        <div className="bg-white rounded-2xl border border-neutral-200 p-8 shadow-sm space-y-6">
          <div className="flex items-center gap-3 pb-4 border-b border-neutral-200">
            <div className="p-3 bg-orange-50 text-orange-600 rounded-xl">
              <FileText className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-neutral-900">Returns, Refunds & Exchanges</h1>
              <p className="text-xs text-neutral-500">Hassle-free resolution process</p>
            </div>
          </div>

          <div className="space-y-4 text-xs text-neutral-700 leading-relaxed">
            <p>
              To initiate a return or exchange, contact support@mevotech.co.za with your order reference number (e.g. MEV-2026-XXXXX) and our dispatch team will book a collection directly from your address.
            </p>
            <p>
              Refunds are processed back to the original payment method (PayFast card, Instant EFT, or Payflex) within 3–5 business days of depot technical inspection.
            </p>
          </div>
        </div>
      )}

      {/* POPIA Privacy Page */}
      {page === 'info_privacy' && (
        <div className="bg-white rounded-2xl border border-neutral-200 p-8 shadow-sm space-y-6">
          <div className="flex items-center gap-3 pb-4 border-b border-neutral-200">
            <div className="p-3 bg-amber-50 text-amber-600 rounded-xl">
              <Lock className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-neutral-900">POPIA Privacy Notice</h1>
              <p className="text-xs text-neutral-500">Protection of Personal Information Act (Act 4 of 2013)</p>
            </div>
          </div>

          <div className="space-y-4 text-xs text-neutral-700 leading-relaxed">
            <h3 className="text-sm font-bold text-neutral-900">1. Information Officer & Scope</h3>
            <p>
              Mevo Tech (Pty) Ltd respects your constitutional right to privacy and complies strictly with the South African Protection of Personal Information Act (POPIA).
            </p>
            <h3 className="text-sm font-bold text-neutral-900 pt-2">2. Personal Information Collected</h3>
            <p>
              We collect your name, mobile phone number, delivery address, and email solely to process your orders, calculate courier logistics, send delivery notifications, and issue tax invoices.
            </p>
            <h3 className="text-sm font-bold text-neutral-900 pt-2">3. Zero Selling of Personal Data</h3>
            <p>
              We do not sell, rent, or lease personal customer data to any third party. Data is only shared with licensed courier partners (The Courier Guy / DPD Laser) for the express purpose of delivery fulfillment.
            </p>
          </div>
        </div>
      )}

      {/* About Mevo Tech */}
      {page === 'info_about' && (
        <div className="bg-white rounded-2xl border border-neutral-200 p-8 shadow-sm space-y-6">
          <h1 className="text-xl font-bold text-neutral-900">About Mevo Tech South Africa</h1>
          <div className="space-y-4 text-xs text-neutral-700 leading-relaxed">
            <p>
              Founded in Johannesburg, Mevo Tech is an independent, specialized retailer focused on premium laptops, workstations, curved OLED displays, and audiophile gear.
            </p>
            <p>
              Unlike dropshipping platforms with unpredictable delivery times and absent support, <strong>Mevo Tech owns 100% of its physical stock</strong>. Every product listed on our store is stocked inside our Sandton depot and inspected by our local engineering team before dispatch.
            </p>
          </div>
        </div>
      )}

      {/* Contact Page */}
      {page === 'info_contact' && (
        <div className="bg-white rounded-2xl border border-neutral-200 p-8 shadow-sm space-y-6">
          <h1 className="text-xl font-bold text-neutral-900">Contact Mevo Tech Specialists</h1>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
            <div className="p-4 rounded-xl bg-neutral-50 border border-neutral-200">
              <Phone className="w-5 h-5 text-orange-600 mb-2" />
              <h3 className="font-bold text-neutral-900">Direct Telephone</h3>
              <p className="text-neutral-500 mt-1">+27 11 884 9200</p>
              <p className="text-[11px] text-neutral-400 mt-0.5">Mon–Fri: 08:00 – 17:00 SAST</p>
            </div>

            <div className="p-4 rounded-xl bg-neutral-50 border border-neutral-200">
              <Mail className="w-5 h-5 text-orange-600 mb-2" />
              <h3 className="font-bold text-neutral-900">Email Inquiries</h3>
              <p className="text-neutral-500 mt-1">support@mevotech.co.za</p>
              <p className="text-[11px] text-neutral-400 mt-0.5">Average response under 2 hours</p>
            </div>

            <div className="p-4 rounded-xl bg-neutral-50 border border-neutral-200">
              <MapPin className="w-5 h-5 text-orange-600 mb-2" />
              <h3 className="font-bold text-neutral-900">Sandton Depot</h3>
              <p className="text-neutral-500 mt-1">5th Floor, Sandton City Tower</p>
              <p className="text-[11px] text-neutral-400 mt-0.5">Johannesburg, 2196</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
