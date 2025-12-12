
import React from 'react';
import { Product } from '../types';

interface StickerProductProps {
  product: Product;
  onAdd: (product: Product) => void;
  onUpdateQuantity: (productId: string, delta: number) => void;
  onClick: (product: Product) => void;
  count: number;
}

export const StickerProduct: React.FC<StickerProductProps> = ({ product, onAdd, onUpdateQuantity, onClick, count }) => {
  const hasMultipleBrands = product.brands && product.brands.length > 0;
  
  const mrp = product.mrp;
  const price = product.price;
  const discount = mrp && mrp > price ? Math.round(((mrp - price) / mrp) * 100) : 0;

  return (
    <div 
      className="bg-white rounded-2xl p-3 shadow-card hover:shadow-card-hover border border-slate-100 flex flex-col h-full relative overflow-visible group active:scale-[0.98] transition-all duration-300"
      onClick={() => onClick(product)}
    >
      {/* Discount Tag */}
      {discount > 0 && (
         <div className="absolute -top-1 -left-1 bg-brand-dark text-white text-[9px] font-black px-2 py-1 rounded-lg z-10 shadow-sm transform -rotate-2">
             {discount}% OFF
         </div>
      )}

      {/* Image / Emoji Area */}
      <div className="aspect-square bg-slate-50/50 rounded-xl flex items-center justify-center mb-3 relative overflow-hidden group-hover:bg-brand-light/20 transition-colors">
        <div className="text-[3.5rem] transition-transform duration-300 group-hover:scale-110 emoji-real">
          {product.emoji}
        </div>
      </div>
      
      {/* Info */}
      <div className="flex-1 flex flex-col">
        <div className="mb-2">
           <h3 className="font-bold text-slate-800 text-xs leading-snug line-clamp-2 min-h-[2.5em]">{product.name}</h3>
           <p className="text-[10px] text-slate-400 font-medium mt-0.5 uppercase tracking-wide">{product.category}</p>
        </div>

        {/* Footer: Price + Add Button */}
        <div className="mt-auto flex items-center justify-between">
            <div className="flex flex-col leading-none">
                <span className="text-[10px] text-slate-400 line-through decoration-slate-300 font-medium h-3 block">{mrp && mrp > price ? `₹${mrp}` : ''}</span>
                <span className="text-sm font-black text-slate-900">₹{price}</span>
            </div>

            <div onClick={(e) => e.stopPropagation()}>
                {count === 0 ? (
                  <button 
                    onClick={() => hasMultipleBrands ? onClick(product) : onAdd(product)}
                    className="h-8 px-4 bg-white border border-brand-DEFAULT text-brand-DEFAULT rounded-lg text-xs font-black uppercase shadow-sm active:bg-brand-light hover:bg-brand-DEFAULT hover:text-white transition-all"
                  >
                    Add
                  </button>
                ) : (
                  <div className="h-8 flex items-center bg-brand-DEFAULT rounded-lg shadow-md overflow-hidden">
                    <button 
                      onClick={() => onUpdateQuantity(product.id, -1)}
                      className="w-8 h-full flex items-center justify-center text-white hover:bg-black/10 transition-colors font-bold text-lg"
                    >
                      -
                    </button>
                    <span className="text-xs font-black text-white px-1">{count}</span>
                    <button 
                      onClick={() => hasMultipleBrands ? onClick(product) : onAdd(product)}
                      className="w-8 h-full flex items-center justify-center text-white hover:bg-black/10 transition-colors font-bold text-lg"
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
