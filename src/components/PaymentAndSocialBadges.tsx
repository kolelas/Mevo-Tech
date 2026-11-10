import React, { useState } from 'react';
import { Check } from 'lucide-react';

export interface SocialItem {
  id: string;
  name: string;
  handle: string;
  url: string;
  renderIcon: () => React.ReactNode;
}

export const SOCIAL_PROFILES: SocialItem[] = [
  {
    id: 'instagram',
    name: 'Instagram',
    handle: '@mevotech_sa',
    url: 'https://instagram.com/mevotech_sa',
    renderIcon: () => (
      /* White rounded square with camera aperture and flash dot (Image 2) */
      <svg viewBox="0 0 24 24" className="w-6 h-6 sm:w-7 sm:h-7 fill-none stroke-white stroke-[2.2] stroke-linecap-round stroke-linejoin-round">
        <rect x="2" y="2" width="20" height="20" rx="5.5" ry="5.5"></rect>
        <circle cx="12" cy="12" r="4.2"></circle>
        <line x1="17.5" y1="6.5" x2="17.51" y2="6.5"></line>
      </svg>
    ),
  },
  {
    id: 'facebook',
    name: 'Facebook',
    handle: 'facebook.com/mevotechsa',
    url: 'https://facebook.com/mevotechsa',
    renderIcon: () => (
      /* Solid white circular disc with dark cutout 'f' (Image 2) */
      <svg viewBox="0 0 28 28" className="w-6 h-6 sm:w-7 sm:h-7">
        <circle cx="14" cy="14" r="14" fill="#FFFFFF" />
        <path
          fill="#171717"
          d="M18.8 14h-3v8.5h-3.5V14h-2.1v-3.1h2.1V8.8c0-2.1 1.2-3.3 3.2-3.3.9 0 1.9.2 1.9.2v2.2h-1.1c-1 0-1.3.6-1.3 1.3V11h2.4l-.4 3z"
        />
      </svg>
    ),
  },
  {
    id: 'x',
    name: 'X (formerly Twitter)',
    handle: '@MevoTechZA',
    url: 'https://x.com/MevoTechZA',
    renderIcon: () => (
      /* Sharp white geometric 𝕏 logo (Image 2) */
      <svg viewBox="0 0 24 24" className="w-5.5 h-5.5 sm:w-6.5 sm:h-6.5 fill-white">
        <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
      </svg>
    ),
  },
  {
    id: 'tiktok',
    name: 'TikTok',
    handle: '@mevotech',
    url: 'https://tiktok.com/@mevotech',
    renderIcon: () => (
      /* Solid white TikTok musical note glyph (Image 2) */
      <svg viewBox="0 0 24 24" className="w-5.5 h-5.5 sm:w-6.5 sm:h-6.5 fill-white">
        <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64c.29 0 .58.04.86.11V9.42a6.33 6.33 0 0 0-.86-.06 6.34 6.34 0 0 0-6.34 6.34 6.34 6.34 0 0 0 6.34 6.34 6.34 6.34 0 0 0 6.34-6.34V9.08a8.16 8.16 0 0 0 4.67 1.48V7.1a4.84 4.84 0 0 1-.9-.41z"/>
      </svg>
    ),
  },
  {
    id: 'youtube',
    name: 'YouTube',
    handle: 'youtube.com/@mevotechza',
    url: 'https://youtube.com/@mevotechza',
    renderIcon: () => (
      /* Solid white rounded rectangle with dark play triangle cutout (Image 2) */
      <svg viewBox="0 0 32 24" className="w-7 h-5 sm:w-8 sm:h-6">
        <rect x="0" y="0" width="32" height="24" rx="6" fill="#FFFFFF" />
        <polygon points="13,7 22,12 13,17" fill="#171717" />
      </svg>
    ),
  },
  {
    id: 'pinterest',
    name: 'Pinterest',
    handle: 'pinterest.com/mevotechza',
    url: 'https://pinterest.com/mevotechza',
    renderIcon: () => (
      /* Solid white circular disc with dark cursive 'P' cutout (Image 2) */
      <svg viewBox="0 0 28 28" className="w-6 h-6 sm:w-7 sm:h-7">
        <circle cx="14" cy="14" r="14" fill="#FFFFFF" />
        <path
          fill="#171717"
          d="M14 6c-4.4 0-8 3.6-8 8 0 3.4 2.1 6.3 5.1 7.4-.1-.6-.1-1.6 0-2.3l1-4s-.2-.5-.2-1.2c0-1.1.6-2 1.4-2 .7 0 1 .5 1 1.1 0 .7-.4 1.7-.7 2.7-.2.8.4 1.5 1.2 1.5 1.4 0 2.5-1.5 2.5-3.7 0-1.9-1.4-3.3-3.4-3.3-2.3 0-3.6 1.7-3.6 3.5 0 .7.3 1.4.6 1.8.1.1.1.2 0 .4l-.2.9c0 .2-.1.2-.3.1-1-.5-1.6-2-1.6-3.2 0-2.6 1.9-4.9 5.4-4.9 2.8 0 5 2 5 4.7 0 2.8-1.8 5.1-4.2 5.1-.8 0-1.6-.4-1.9-.9l-.5 1.9c-.2.7-.7 1.6-1 2.1.8.2 1.6.4 2.4.4 4.4 0 8-3.6 8-8s-3.6-8-8-8z"
        />
      </svg>
    ),
  },
];

export const PaymentGatewaysRow: React.FC<{ titleClassName?: string; showTitle?: boolean }> = ({
  titleClassName = 'text-white font-bold text-base sm:text-lg mb-3 tracking-tight',
  showTitle = true,
}) => {
  return (
    <div>
      {showTitle && <h3 className={titleClassName}>We accept</h3>}
      <div className="flex flex-wrap items-center gap-2 sm:gap-2.5">
        {/* 1. VISA */}
        <div
          className="h-8 sm:h-9 w-12 sm:w-14 bg-white rounded-md border border-neutral-300/80 shadow-2xs flex items-center justify-center p-1 shrink-0 overflow-hidden hover:scale-105 transition-transform cursor-pointer"
          title="Visa Debit & Credit Card"
        >
          <svg viewBox="0 0 48 30" className="h-4 sm:h-4.5 w-auto">
            <path
              fill="#1A1F71"
              d="M18.8 6.5l-3.3 16.8h-3.4L8.7 8.5C8.5 7.6 8.3 7.3 7.6 6.9c-1.2-.6-3.2-1.2-4.9-1.6l.1-.6h8.4c1.1 0 2 .7 2.2 2l2 11.2 5.1-11.4h3.3zm13.7 11.3c0-4.4-6.1-4.7-6-6.6 0-.6.6-1.2 1.8-1.4.6-.1 2.3-.2 4.2.7l.8-3.5c-1-.4-2.4-.7-4.1-.7-4.3 0-7.3 2.3-7.3 5.6 0 2.4 2.2 3.8 3.8 4.6 1.7.8 2.3 1.4 2.3 2.1 0 1.2-1.4 1.7-2.7 1.7-1.8 0-2.8-.3-4.3-1l-.8 3.6c1 .5 2.8.9 4.7.9 4.5 0 7.4-2.2 7.4-5.5zm8.5 5.5h3.1l-2.7-16.8h-2.9c-.7 0-1.2.4-1.4 1l-5.1 12.3h3.5l.7-2h4.3l.5 5.5zm-3.7-4.8l1.7-4.7 1 4.7h-2.7zm-14.8-12l-2.7 16.8h-3.3l2.7-16.8h3.3z"
            />
            <path fill="#F7B600" d="M7.6 6.9c-1.2-.6-3.2-1.2-4.9-1.6l-.1-.6h8.4c1.1 0 2 .7 2.2 2l.1-.6H7.6z" />
          </svg>
        </div>

        {/* 2. Mastercard */}
        <div
          className="h-8 sm:h-9 w-12 sm:w-14 bg-white rounded-md border border-neutral-300/80 shadow-2xs flex items-center justify-center p-1 shrink-0 overflow-hidden hover:scale-105 transition-transform cursor-pointer"
          title="Mastercard"
        >
          <svg viewBox="0 0 38 24" className="h-5 sm:h-5.5 w-auto">
            <circle cx="14" cy="12" r="9" fill="#EB001B" />
            <circle cx="24" cy="12" r="9" fill="#F79E1B" />
            <path d="M19 5.6a9 9 0 0 1 0 12.8 9 9 0 0 1 0-12.8z" fill="#FF5F00" />
          </svg>
        </div>

        {/* 3. Maestro */}
        <div
          className="h-8 sm:h-9 w-12 sm:w-14 bg-white rounded-md border border-neutral-300/80 shadow-2xs flex flex-col items-center justify-center p-0.5 shrink-0 overflow-hidden hover:scale-105 transition-transform cursor-pointer"
          title="Maestro Debit Card"
        >
          <svg viewBox="0 0 36 18" className="h-3.5 sm:h-4 w-auto">
            <circle cx="13" cy="9" r="7.5" fill="#EB001B" />
            <circle cx="23" cy="9" r="7.5" fill="#00A2E5" />
            <path d="M18 3.7a7.5 7.5 0 0 1 0 10.6 7.5 7.5 0 0 1 0-10.6z" fill="#7360A8" />
          </svg>
          <span className="text-[6.5px] font-sans font-bold text-neutral-800 tracking-tight leading-none mt-0.5">maestro.</span>
        </div>

        {/* 4. American Express (Signature Blue Card) */}
        <div
          className="h-8 sm:h-9 w-12 sm:w-14 bg-[#006FCF] rounded-md border border-[#005fb3] shadow-2xs flex items-center justify-center p-0.5 shrink-0 overflow-hidden hover:scale-105 transition-transform cursor-pointer"
          title="American Express"
        >
          <div className="border border-white/60 rounded-[3px] px-1 py-0.5 flex flex-col items-center justify-center">
            <span className="text-[6px] font-black text-white tracking-wider leading-none font-sans uppercase">AMERICAN</span>
            <span className="text-[6px] font-black text-white tracking-wider leading-none font-sans uppercase mt-[1px]">EXPRESS</span>
          </div>
        </div>

        {/* 5. Discover */}
        <div
          className="h-8 sm:h-9 w-12 sm:w-14 bg-white rounded-md border border-neutral-300/80 shadow-2xs flex items-center justify-center p-1 shrink-0 overflow-hidden hover:scale-105 transition-transform cursor-pointer"
          title="Discover Network"
        >
          <div className="flex items-center">
            <span className="text-[7.5px] font-black text-neutral-900 font-sans tracking-tight">DISC</span>
            <span className="w-2 h-2 rounded-full bg-[#FF6000] inline-block mx-[0.5px]"></span>
            <span className="text-[7.5px] font-black text-neutral-900 font-sans tracking-tight">VER</span>
          </div>
        </div>

        {/* 6. Diners Club International */}
        <div
          className="h-8 sm:h-9 w-12 sm:w-14 bg-white rounded-md border border-neutral-300/80 shadow-2xs flex items-center justify-center p-1 shrink-0 overflow-hidden hover:scale-105 transition-transform cursor-pointer"
          title="Diners Club International"
        >
          <div className="flex items-center gap-0.5">
            <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 text-[#004A97]" fill="currentColor">
              <circle cx="12" cy="12" r="10" stroke="#004A97" strokeWidth="2" fill="none" />
              <path d="M12 4a8 8 0 0 1 8 8 8 8 0 0 1-8 8V4z" fill="#004A97" />
              <circle cx="12" cy="12" r="4.5" fill="white" />
            </svg>
            <div className="flex flex-col text-[5px] font-bold text-[#004A97] leading-tight font-sans">
              <span>Diners Club</span>
              <span className="text-[3.5px] font-medium text-neutral-500 uppercase tracking-tighter">INTERNATIONAL</span>
            </div>
          </div>
        </div>

        {/* 7. Apple Pay */}
        <div
          className="h-8 sm:h-9 w-12 sm:w-14 bg-white rounded-md border border-neutral-300/80 shadow-2xs flex items-center justify-center p-1 shrink-0 overflow-hidden hover:scale-105 transition-transform cursor-pointer"
          title="Apple Pay"
        >
          <div className="flex items-center gap-0.5 text-neutral-950 font-sans">
            <svg viewBox="0 0 170 170" className="h-3 sm:h-3.5 w-auto fill-current">
              <path d="M150.37 130.25c-2.45 5.66-5.35 10.87-8.71 15.66-4.58 6.53-8.33 11.05-11.22 13.56-4.48 4.12-9.28 6.23-14.42 6.35-3.69 0-8.14-1.05-13.32-3.18-5.19-2.12-9.97-3.17-14.34-3.17-4.58 0-9.49 1.05-14.75 3.17-5.26 2.13-9.5 3.24-12.74 3.35-4.35.13-9.16-1.9-14.42-6.08-3.69-3.04-7.67-7.81-11.96-14.34-5.78-8.83-10.24-18.77-13.39-29.83-3.15-11.05-4.73-21.75-4.73-32.08 0-14.88 3.78-27.14 11.35-36.78 7.56-9.64 17.07-14.54 28.53-14.71 4.71 0 10.15 1.25 16.33 3.75 6.18 2.5 10.05 3.78 11.61 3.84 1.34 0 5.48-1.42 12.42-4.26 6.94-2.84 12.58-4.14 16.92-3.9 12.56.89 22.45 5.56 29.68 14.02-10.98 6.7-16.35 15.89-16.12 27.57.23 9.4 3.84 17.34 10.83 23.82 6.99 6.48 15.35 10.23 25.07 11.24-2.23 6.92-4.99 13.78-8.29 20.59zM119.22 33.15c0-7.25 2.65-14.19 7.95-20.81 5.3-6.62 11.9-10.94 19.8-12.96.22 1.12.33 2.13.33 3.03 0 7.25-2.73 14.28-8.19 21.09-5.46 6.81-12.19 11.13-20.19 12.96-.22-1.12-.33-2.12-.33-3.31z" />
            </svg>
            <span className="font-semibold text-[10px] sm:text-[11px] tracking-tight">Pay</span>
          </div>
        </div>

        {/* 8. Instant EFT */}
        <div
          className="h-8 sm:h-9 w-12 sm:w-14 bg-white rounded-md border border-neutral-300/80 shadow-2xs flex items-center justify-center p-1 shrink-0 overflow-hidden hover:scale-105 transition-transform cursor-pointer"
          title="Instant EFT (All SA Banks: FNB, Standard Bank, Capitec, Nedbank, Absa, Investec)"
        >
          <div className="flex items-center gap-0.5">
            <div className="flex flex-col gap-[1.5px]">
              <div className="w-2 h-[2px] bg-[#0077C8] rounded-full"></div>
              <div className="w-3 h-[2px] bg-[#0077C8] rounded-full"></div>
              <div className="w-1.5 h-[2px] bg-[#0077C8] rounded-full"></div>
            </div>
            <span className="text-[10px] font-black italic tracking-tight text-[#0077C8] font-sans">EFT</span>
          </div>
        </div>

        {/* 9. Google Pay */}
        <div
          className="h-8 sm:h-9 w-12 sm:w-14 bg-white rounded-md border border-neutral-300/80 shadow-2xs flex items-center justify-center p-1 shrink-0 overflow-hidden hover:scale-105 transition-transform cursor-pointer"
          title="Google Pay"
        >
          <div className="flex items-center gap-1 font-sans">
            <svg viewBox="0 0 24 24" className="w-3.5 h-3.5">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" fill="#FBBC05" />
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" fill="#EA4335" />
            </svg>
            <span className="text-[9px] font-bold text-neutral-700 tracking-tight">Pay</span>
          </div>
        </div>

        {/* 10. Payflex (Lilac Card) */}
        <div
          className="h-8 sm:h-9 w-12 sm:w-14 bg-[#DCCEF7] rounded-md border border-[#c4b0ea] shadow-2xs flex items-center justify-center p-1 shrink-0 overflow-hidden hover:scale-105 transition-transform cursor-pointer"
          title="Payflex - 4 equal interest-free instalments every 2 weeks"
        >
          <div className="flex items-center gap-0.5 text-[#1a1240]">
            <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 fill-current">
              <path d="M12 2L15 8L21 8L16.5 12L19 18L12 14L5 18L7.5 12L3 8L9 8L12 2Z" />
            </svg>
            <span className="text-[8.5px] font-black tracking-tighter font-sans lowercase">payflex</span>
          </div>
        </div>

        {/* 11. UnionPay / Global Card Schemes */}
        <div
          className="h-8 sm:h-9 w-12 sm:w-14 bg-white rounded-md border border-neutral-300/80 shadow-2xs flex items-center justify-center p-1 shrink-0 overflow-hidden hover:scale-105 transition-transform cursor-pointer"
          title="UnionPay & SADC International Debit Cards"
        >
          <div className="flex items-center -space-x-1">
            <div className="w-3.5 h-4 bg-[#D81E06] rounded-[2px] transform -skew-x-12"></div>
            <div className="w-3.5 h-4 bg-[#002D80] rounded-[2px] transform -skew-x-12"></div>
            <div className="w-3.5 h-4 bg-[#008A3B] rounded-[2px] transform -skew-x-12"></div>
          </div>
        </div>

        {/* 12. PayFast / Capitec Pay Badge (South Africa Essential) */}
        <div
          className="h-8 sm:h-9 w-12 sm:w-14 bg-white rounded-md border border-neutral-300/80 shadow-2xs flex flex-col items-center justify-center p-0.5 shrink-0 overflow-hidden hover:scale-105 transition-transform cursor-pointer"
          title="PayFast & Capitec Pay"
        >
          <span className="text-[8px] font-black text-[#ED1C24] tracking-tight leading-none font-sans">PayFast</span>
          <span className="text-[6px] font-bold text-neutral-600 tracking-tight leading-none mt-0.5">&amp; Capitec</span>
        </div>
      </div>
    </div>
  );
};

export const SocialLinksRow: React.FC<{
  title?: string;
  titleClassName?: string;
  showTitle?: boolean;
}> = ({
  title = 'Connect with Mevo Tech',
  titleClassName = 'text-white font-bold text-base sm:text-lg mb-3 tracking-tight',
  showTitle = true,
}) => {
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const handleCopyHandle = (social: SocialItem) => {
    navigator.clipboard.writeText(social.handle);
    setCopiedId(social.id);
    setTimeout(() => setCopiedId(null), 2500);
  };

  return (
    <div>
      {showTitle && <h3 className={titleClassName}>{title}</h3>}
      {/* Clean horizontal row of crisp white glyphs matching image_097ccab1.png */}
      <div className="flex items-center gap-4 sm:gap-5 flex-wrap">
        {SOCIAL_PROFILES.map((social) => {
          const isCopied = copiedId === social.id;
          return (
            <div key={social.id} className="relative group">
              <a
                href={social.url}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => handleCopyHandle(social)}
                className="flex items-center justify-center text-white hover:opacity-75 hover:scale-115 transition-all duration-200 cursor-pointer p-0.5"
                aria-label={`Follow Mevo Tech on ${social.name}`}
                title={`${social.name}: ${social.handle}`}
              >
                {social.renderIcon()}
              </a>

              {/* Tooltip on hover */}
              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:flex flex-col items-center z-30 pointer-events-none">
                <div className="bg-neutral-950 text-white text-[11px] font-semibold px-2.5 py-1 rounded-lg border border-neutral-700 shadow-xl whitespace-nowrap flex items-center gap-1.5">
                  <span>{social.name}</span>
                  <span className="text-neutral-400 font-mono text-[10px]">{social.handle}</span>
                  {isCopied && (
                    <span className="text-emerald-400 text-[10px] flex items-center gap-0.5">
                      <Check className="w-3 h-3" /> Copied!
                    </span>
                  )}
                </div>
                <div className="w-2 h-2 bg-neutral-950 rotate-45 -mt-1 border-r border-b border-neutral-700"></div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
