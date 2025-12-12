
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
      className="bg-white rounded-[1.5rem] p-4 shadow-card hover:shadow-card-hover flex flex-col h-full relative overflow-visible group active:scale-[0.98] transition-all duration-300"
      onClick={() => onClick(product)}
    >
      {/* Discount Badge */}
      {discount > 0 && (
         <div className="absolute top-0 left-0 bg-slate-900 text-white text-[9px] font-black px-2.5 py-1 rounded-br-xl rounded-tl-[1.5rem] z-10 shadow-sm">
             {discount}% OFF
         </div>
      )}

      {/* Image / Emoji Area */}
      <div className="aspect-[1/0.9] flex items-center justify-center mb-1 relative">
        <div className="text-[4rem] transition-transform duration-500 group-hover:scale-110 emoji-real filter drop-shadow-lg animate-float">
          {product.emoji}
        </div>
      </div>
      
      {/* Info */}
      <div className="flex-1 flex flex-col">
        <div className="mb-3">
           <h3 className="font-bold text-slate-800 text-sm leading-tight line-clamp-2 min-h-[2.4em]">{product.name}</h3>
           <p className="text-[10px] text-slate-400 font-bold mt-1 uppercase tracking-wide">{product.category}</p>
        </div>

        {/* Footer: Price + Add Button */}
        <div className="mt-auto flex items-end justify-between">
            <div className="flex flex-col leading-none">
                <span className="text-[10px] text-slate-400 line-through font-medium h-3 block">{mrp && mrp > price ? `₹${mrp}` : ''}</span>
                <span className="text-base font-black text-slate-900">₹{price}</span>
            </div>

            <div onClick={(e) => e.stopPropagation()} className="shadow-lg rounded-xl">
                {count === 0 ? (
                  <button 
                    onClick={() => hasMultipleBrands ? onClick(product) : onAdd(product)}
                    className="h-9 px-5 bg-white border border-brand-light text-brand-DEFAULT rounded-xl text-xs font-black uppercase shadow-sm active:bg-brand-light hover:bg-brand-DEFAULT hover:text-white transition-all"
                  >
                    Add
                  </button>
                ) : (
                  <div className="h-9 flex items-center bg-brand-DEFAULT rounded-xl overflow-hidden ring-2 ring-brand-light">
                    <button 
                      onClick={() => onUpdateQuantity(product.id, -1)}
                      className="w-9 h-full flex items-center justify-center text-white hover:bg-black/10 transition-colors font-bold text-lg"
                    >
                      -
                    </button>
                    <span className="text-xs font-black text-white px-1 min-w-[20px] text-center">{count}</span>
                    <button 
                      onClick={() => hasMultipleBrands ? onClick(product) : onAdd(product)}
                      className="w-9 h-full flex items-center justify-center text-white hover:bg-black/10 transition-colors font-bold text-lg"
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
