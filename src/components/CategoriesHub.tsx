import React from 'react';
import { ArrowRight, Sparkles, ShieldCheck, Truck, Laptop, Monitor, Cpu, Headphones, HardDrive, Wifi } from 'lucide-react';
import { CATEGORIES_DATA } from '../data/categories';
import { Product } from '../types';

interface CategoriesHubProps {
  products: Product[];
  onSelectCategory: (slug: string) => void;
  onBackToHome: () => void;
}

const ICON_MAP = {
  Laptop,
  Monitor,
  Cpu,
  Headphones,
  HardDrive,
  Wifi,
};

export const CategoriesHub: React.FC<CategoriesHubProps> = ({
  products,
  onSelectCategory,
  onBackToHome,
}) => {
  return (
    <div className="bg-neutral-50 min-h-screen py-10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-10 text-center max-w-3xl mx-auto">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-purple-50 border border-purple-200 text-purple-700 text-xs font-semibold uppercase tracking-wider mb-3">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Mevo Tech Official Department Directory</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-neutral-900 tracking-tight">
            Explore Hardware Categories
          </h1>
          <p className="mt-3 text-sm text-neutral-600 leading-relaxed">
            Browse our specialized engineering categories. Every item in our catalogue is held in physical stock at our Sandton warehouse depot, backed by verified local warranties, and ready for immediate nationwide courier dispatch.
          </p>
        </div>

        {/* Categories Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {CATEGORIES_DATA.map((cat) => {
            const Icon = ICON_MAP[cat.iconName] || Sparkles;
            const categoryProducts = products.filter(
              (p) => p.category.toLowerCase() === cat.dbCategory.toLowerCase()
            );

            return (
              <div
                key={cat.slug}
                className="bg-white rounded-2xl border border-neutral-200 hover:border-purple-500 overflow-hidden shadow-xs hover:shadow-[0_0_25px_rgba(168,85,247,0.35)] transition-all duration-300 flex flex-col group"
              >
                {/* Visual Image Banner */}
                <div className="relative aspect-16/9 bg-neutral-900 overflow-hidden">
                  <img
                    src={cat.heroImage}
                    alt={cat.name}
                    className="w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-500 opacity-90"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-neutral-950 via-neutral-950/40 to-transparent" />
                  
                  <div className="absolute top-3 left-3 bg-neutral-900/80 backdrop-blur-md px-2.5 py-1 rounded-lg text-xs font-semibold text-white flex items-center gap-1.5 border border-neutral-800">
                    <Icon className="w-3.5 h-3.5 text-purple-400" />
                    <span>{categoryProducts.length} Products</span>
                  </div>

                  <div className="absolute bottom-3 left-3 right-3 text-white">
                    <p className="text-[11px] font-semibold text-purple-400 uppercase tracking-wider">
                      Sandton Stock
                    </p>
                    <h3 className="text-base sm:text-lg font-bold leading-tight">
                      {cat.name}
                    </h3>
                  </div>
                </div>

                {/* Body Content */}
                <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
                  <p className="text-xs text-neutral-600 leading-relaxed line-clamp-2">
                    {cat.description}
                  </p>

                  {/* Highlights */}
                  <div className="space-y-1.5 pt-2 border-t border-neutral-100 text-xs">
                    {cat.highlights.slice(0, 2).map((h, i) => (
                      <div key={i} className="flex items-center justify-between text-neutral-500">
                        <span>{h.label}</span>
                        <span className="font-semibold text-neutral-800">{h.value}</span>
                      </div>
                    ))}
                  </div>

                  {/* Subcategories tags */}
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {cat.subCategories.slice(1).map((sub) => (
                      <span
                        key={sub}
                        className="text-[10px] bg-neutral-100 text-neutral-600 px-2 py-0.5 rounded font-medium"
                      >
                        {sub}
                      </span>
                    ))}
                  </div>

                  {/* Enter Category Page CTA */}
                  <button
                    onClick={() => {
                      onSelectCategory(cat.slug);
                      window.scrollTo({ top: 0, behavior: 'smooth' });
                    }}
                    className="w-full mt-2 py-2.5 px-4 bg-neutral-900 group-hover:bg-purple-600 text-white rounded-xl text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 transition-colors shadow-xs"
                  >
                    <span>View {cat.shortName} Page</span>
                    <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* Bottom Banner */}
        <div className="mt-12 bg-white rounded-2xl border border-neutral-200 p-6 sm:p-8 flex flex-col sm:flex-row items-center justify-between gap-6 shadow-xs">
          <div className="space-y-1 text-center sm:text-left">
            <h4 className="text-base font-bold text-neutral-900">
              Need custom enterprise specifications or bulk procurement?
            </h4>
            <p className="text-xs text-neutral-500">
              Direct B2B invoicing with 15% VAT split, dedicated account manager, and on-site Sandton collection.
            </p>
          </div>
          <button
            onClick={onBackToHome}
            className="px-5 py-2.5 bg-neutral-100 hover:bg-neutral-200 text-neutral-800 rounded-xl text-xs font-semibold whitespace-nowrap transition-colors"
          >
            Return to Storefront
          </button>
        </div>
      </div>
    </div>
  );
};
