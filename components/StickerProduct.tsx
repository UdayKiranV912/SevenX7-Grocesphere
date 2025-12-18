
import React, { useState } from 'react';
import { Product, Variant } from '../types';

interface StickerProductProps {
  product: Product;
  onAdd: (product: Product, quantity?: number, brand?: string, price?: number, variant?: Variant) => void;
  onUpdateQuantity: (productId: string, delta: number) => void;
  onClick: (product: Product) => void;
  count: number;
  isFavorite?: boolean;
  onToggleFavorite?: (id: string) => void;
}

export const StickerProduct: React.FC<StickerProductProps> = ({ 
    product, onAdd, onUpdateQuantity, onClick, count,
    isFavorite = false, onToggleFavorite 
}) => {
  const [showQuickSelect, setShowQuickSelect] = useState(false);

  const hasMultipleBrands = product.brands && product.brands.length > 0;
  const hasVariants = product.variants && product.variants.length > 0;
  const isComplex = hasMultipleBrands || hasVariants;

  // Calculate fake MRP for demo visual
  const markupFactor = 1.2 + (parseInt(product.id.replace(/\D/g, '')) % 3) * 0.1;
  const mrp = Math.ceil(product.price * markupFactor);
  const discount = Math.round(((mrp - product.price) / mrp) * 100);

  const handleQuickAddClick = (e: React.MouseEvent) => {
      e.stopPropagation();
      if (isComplex) {
          setShowQuickSelect(true);
      } else {
          onAdd(product);
      }
  };

  const handleVariantSelect = (e: React.MouseEvent, variant: Variant) => {
      e.stopPropagation();
      // Default to first brand price if brands exist, else base price
      const defaultBrand = product.brands?.[0];
      const basePrice = defaultBrand ? defaultBrand.price : product.price;
      const brandName = defaultBrand ? defaultBrand.name : 'Generic';
      const finalPrice = Math.ceil(basePrice * variant.multiplier);
      
      onAdd(product, 1, brandName, finalPrice, variant);
      setShowQuickSelect(false);
  };

  const handleBrandSelect = (e: React.MouseEvent, brand: {name: string, price: number}) => {
      e.stopPropagation();
      onAdd(product, 1, brand.name, brand.price);
      setShowQuickSelect(false);
  };

  return (
    <div 
      className={`group relative bg-white rounded-[20px] p-3 flex flex-col shadow-card transition-all duration-300 active:scale-[0.98] cursor-pointer overflow-visible border border-transparent ${count > 0 ? 'ring-2 ring-brand-DEFAULT ring-offset-2' : 'hover:border-brand-light hover:shadow-lg'}`}
      onClick={() => onClick(product)}
    >
      {/* Quick Select Overlay */}
      {showQuickSelect && (
         <div 
            className="absolute inset-0 bg-white/95 backdrop-blur-md z-[60] rounded-[20px] p-3 flex flex-col animate-fade-in border-2 border-brand-light shadow-xl overflow-hidden" 
            onClick={(e) => e.stopPropagation()}
         >
            <div className="flex justify-between items-center mb-2 pb-2 border-b border-slate-100 shrink-0">
               <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">
                  {hasVariants ? 'Select Size' : 'Select Brand'}
               </span>
               <button 
                  onClick={() => setShowQuickSelect(false)} 
                  className="w-6 h-6 bg-slate-100 rounded-full flex items-center justify-center text-slate-400 hover:bg-slate-200 transition-colors"
               >
                  ✕
               </button>
            </div>
            <div className="flex-1 overflow-y-auto hide-scrollbar space-y-2">
               {hasVariants ? (
                  product.variants?.map((v, i) => (
                      <button 
                        key={i} 
                        onClick={(e) => handleVariantSelect(e, v)} 
                        className="w-full flex justify-between items-center p-2.5 rounded-xl bg-slate-50 hover:bg-brand-DEFAULT hover:text-white group transition-all border border-slate-100 text-left"
                      >
                          <span className="text-xs font-bold">{v.name}</span>
                          <span className="text-xs font-bold text-slate-500 group-hover:text-white">
                              ₹{Math.ceil((product.brands?.[0]?.price || product.price) * v.multiplier)}
                          </span>
                      </button>
                  ))
               ) : (
                  product.brands?.map((b, i) => (
                      <button 
                        key={i} 
                        onClick={(e) => handleBrandSelect(e, b)} 
                        className="w-full flex justify-between items-center p-2.5 rounded-xl bg-slate-50 hover:bg-brand-DEFAULT hover:text-white group transition-all border border-slate-100 text-left"
                      >
                          <span className="text-xs font-bold">{b.name}</span>
                          <span className="text-xs font-bold text-slate-500 group-hover:text-white">₹{b.price}</span>
                      </button>
                  ))
               )}
            </div>
         </div>
       )}

      {/* Discount Badge */}
      <div className="absolute top-0 left-0 bg-gradient-to-br from-brand-DEFAULT to-brand-medium text-white text-[9px] font-black px-2 py-1 rounded-br-xl z-10 shadow-sm">
          {discount}% OFF
      </div>

      {/* Favorite Button */}
      <button 
        onClick={(e) => { e.stopPropagation(); onToggleFavorite?.(product.id); }}
        className="absolute top-2 right-2 z-20 w-8 h-8 flex items-center justify-center rounded-full transition-transform hover:scale-110 active:scale-90"
      >
        <span className={`text-xl filter drop-shadow-sm ${isFavorite ? 'grayscale-0' : 'grayscale opacity-30 hover:opacity-100 transition-opacity'}`}>
            {isFavorite ? '❤️' : '🤍'}
        </span>
      </button>

      {/* Quick View Tooltip (Improved) */}
      <div className="absolute left-0 right-0 -bottom-2 translate-y-full opacity-0 group-hover:opacity-100 transition-all duration-300 pointer-events-none z-[60] px-1 transform group-hover:translate-y-2 hidden md:block">
         <div className="bg-slate-900/95 text-white text-[10px] p-3 rounded-xl backdrop-blur-md shadow-xl border border-white/10 relative">
            {/* Arrow */}
            <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-slate-900/95 rotate-45 border-t border-l border-white/10"></div>
            
            <div className="flex justify-between items-start mb-1.5 border-b border-white/10 pb-1">
                <span className="font-bold text-brand-light line-clamp-1 mr-2 text-xs">{product.name}</span>
                <span className="font-black text-brand-DEFAULT whitespace-nowrap">₹{product.price}</span>
            </div>
            <p className="opacity-80 line-clamp-3 leading-relaxed text-slate-300 font-medium">
                {product.description || `Fresh ${product.category} sourced locally from our store partners.`}
            </p>
         </div>
      </div>

      {/* Image Area */}
      <div className="relative aspect-square mb-2 rounded-2xl bg-slate-50 flex items-center justify-center group-hover:bg-brand-light/30 transition-colors mt-2">
        <div className={`text-6xl transform transition-all duration-500 emoji-3d group-hover:scale-110 ${count > 0 ? 'scale-105' : ''}`}>
          {product.emoji}
        </div>
        
        {count > 0 && (
          <div className="absolute -top-1 -right-1 bg-brand-DEFAULT text-white text-[10px] font-bold w-6 h-6 rounded-full flex items-center justify-center shadow-lg animate-scale-in border-2 border-white z-10">
            {count}
          </div>
        )}

        {isComplex && count === 0 && (
           <div className="absolute bottom-2 left-1/2 -translate-x-1/2 bg-white/90 px-2 py-0.5 rounded-full text-[9px] font-bold text-slate-500 shadow-sm border border-slate-100 whitespace-nowrap">
               {hasVariants ? 'Select Size' : `${product.brands?.length} Options`}
           </div>
        )}
      </div>
      
      {/* Content Area */}
      <div className="flex-1 flex flex-col justify-between">
        <div>
          <h3 className="font-bold text-slate-800 text-sm leading-tight line-clamp-2 mb-1 group-hover:text-brand-dark transition-colors">{product.name}</h3>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">{product.category}</p>
        </div>

        <div className="flex items-end justify-between mt-3">
          <div className="flex flex-col leading-none">
              <span className="text-[10px] text-slate-400 line-through decoration-slate-400/50 mb-0.5">₹{mrp}</span>
              <span className="font-black text-slate-900 text-lg">₹{product.price}</span>
          </div>
          
          <div className="h-9 flex items-center">
            {count === 0 ? (
              <button 
                onClick={handleQuickAddClick}
                className="w-9 h-9 rounded-xl bg-slate-100 text-brand-DEFAULT hover:bg-brand-DEFAULT hover:text-white transition-all flex items-center justify-center shadow-sm active:scale-90 touch-manipulation"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
                </svg>
              </button>
            ) : (
              <div className="flex items-center bg-slate-900 rounded-xl px-1 h-9 shadow-md animate-scale-in">
                <button 
                  onClick={(e) => { e.stopPropagation(); onUpdateQuantity(product.id, -1); }}
                  className="w-8 h-full flex items-center justify-center text-white hover:bg-white/10 rounded-lg transition-colors font-bold touch-manipulation"
                >
                  −
                </button>
                <button 
                  onClick={(e) => { e.stopPropagation(); onClick(product); }} // Always open modal to manage (add more/change variant)
                  className="w-8 h-full flex items-center justify-center text-white hover:bg-white/10 rounded-lg transition-colors font-bold touch-manipulation"
                >
                  +
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
