
import React, { useEffect, useState } from 'react';
import { Product, Variant } from '../types';
import { generateProductDetails } from '../services/geminiService';

interface ProductDetailsModalProps {
  product: Product;
  onClose: () => void;
  onAdd: (product: Product, quantity: number, brand?: string, price?: number, variant?: Variant) => void;
  onUpdateDetails?: (id: string, details: Partial<Product>) => void;
}

export const ProductDetailsModal: React.FC<ProductDetailsModalProps> = ({ product, onClose, onAdd, onUpdateDetails }) => {
  const [details, setDetails] = useState<Partial<Product>>({
    description: product.description,
    ingredients: product.ingredients,
    nutrition: product.nutrition
  });
  
  const [loading, setLoading] = useState(!product.description || !product.ingredients || !product.nutrition);
  const [quantity, setQuantity] = useState(1);
  const [selectedBrandIndex, setSelectedBrandIndex] = useState(0);
  const [selectedVariantIndex, setSelectedVariantIndex] = useState(0);

  // Lock body scroll when modal is open
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = '';
    };
  }, []);

  // If products have brands, use the first one, otherwise generic
  const brands = product.brands || [{name: 'Generic', price: product.price}];
  const variants = product.variants || [];
  
  // Price Calculation: Brand Price * Variant Multiplier
  const basePrice = brands[selectedBrandIndex].price;
  const variantMultiplier = variants.length > 0 ? variants[selectedVariantIndex].multiplier : 1;
  const finalPrice = Math.ceil(basePrice * variantMultiplier);
  
  const currentBrandName = brands[selectedBrandIndex].name;
  const currentVariant = variants.length > 0 ? variants[selectedVariantIndex] : undefined;

  useEffect(() => {
    let isMounted = true;
    const fetchDetails = async () => {
      if (!product.description || !product.ingredients || !product.nutrition) {
        setLoading(true);
        try {
          const generated = await generateProductDetails(product.name);
          if (isMounted) {
            setDetails(generated);
            setLoading(false);
            if (onUpdateDetails) onUpdateDetails(product.id, generated);
          }
        } catch (error) {
          if (isMounted) setLoading(false);
        }
      } else {
        setLoading(false);
      }
    };
    fetchDetails();
    return () => { isMounted = false; };
  }, [product, onUpdateDetails]);

  return (
    <div className="fixed inset-0 z-[80] flex items-end sm:items-center justify-center sm:px-4 pointer-events-none">
      <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm animate-fade-in pointer-events-auto" onClick={onClose} />

      <div className="relative w-full max-w-sm bg-white rounded-t-[2rem] sm:rounded-[2rem] p-5 shadow-2xl animate-slide-up overflow-hidden max-h-[85vh] overflow-y-auto hide-scrollbar pointer-events-auto">
        {/* Background Blob */}
        <div className="absolute top-0 left-0 right-0 h-32 bg-gradient-to-b from-brand-light to-white -z-10"></div>
        
        {/* Close */}
        <button onClick={onClose} className="absolute top-4 right-4 w-7 h-7 flex items-center justify-center bg-white/60 backdrop-blur rounded-full text-slate-500 hover:bg-white hover:text-slate-800 transition-all z-20 shadow-sm border border-white">✕</button>

        {/* Hero - Compact */}
        <div className="flex gap-4 items-center pt-2 mb-3">
          <div className="w-20 h-20 bg-white rounded-2xl flex items-center justify-center text-5xl shadow-soft border-2 border-white shrink-0">
            {product.emoji}
          </div>

          <div className="flex-1 min-w-0">
             <h2 className="text-xl font-black text-slate-900 tracking-tight leading-tight mb-0.5 line-clamp-2">{product.name}</h2>
             <div className="flex items-baseline gap-2">
                 <p className="text-xl font-black text-brand-DEFAULT">₹{finalPrice}</p>
                 {variants.length > 0 && (
                     <span className="text-[9px] font-bold text-slate-400 bg-slate-50 px-1.5 py-0.5 rounded">
                         / {variants[selectedVariantIndex].name}
                     </span>
                 )}
             </div>
          </div>
        </div>

        {/* Selectors - Compact Rows */}
        <div className="space-y-3">
            {variants.length > 0 && (
               <div className="flex gap-2 overflow-x-auto hide-scrollbar pb-1">
                  {variants.map((v, idx) => (
                     <button
                        key={idx}
                        onClick={() => setSelectedVariantIndex(idx)}
                        className={`px-3 py-1.5 rounded-lg text-[10px] font-bold transition-all border whitespace-nowrap ${
                            selectedVariantIndex === idx 
                              ? 'bg-slate-800 text-white border-slate-800 shadow-md' 
                              : 'bg-white text-slate-600 border-slate-200'
                        }`}
                     >
                        {v.name}
                     </button>
                  ))}
               </div>
            )}

            {product.brands && product.brands.length > 0 && (
               <div className="flex gap-2 overflow-x-auto hide-scrollbar pb-1">
                  {brands.map((brand, idx) => {
                     const priceForThisBrand = Math.ceil(brand.price * variantMultiplier);
                     return (
                         <button
                         key={idx}
                         onClick={() => setSelectedBrandIndex(idx)}
                         className={`px-3 py-1.5 rounded-lg text-[10px] font-bold transition-all border whitespace-nowrap ${
                             selectedBrandIndex === idx 
                                 ? 'bg-slate-900 text-white border-slate-900 shadow-md' 
                                 : 'bg-white text-slate-600 border-slate-200'
                         }`}
                         >
                         {brand.name} <span className="opacity-60 ml-1">₹{priceForThisBrand}</span>
                         </button>
                     );
                  })}
               </div>
            )}
        </div>

        {/* Content */}
        <div className="mt-3 min-h-[3rem]">
           {loading ? (
              <div className="flex items-center gap-2 text-slate-400 text-xs py-2">
                 <span className="animate-spin">✨</span> Loading details...
              </div>
           ) : (
              <div className="animate-fade-in space-y-2">
                  <p className="text-xs text-slate-600 font-medium leading-relaxed">
                     {details.description}
                  </p>
                  
                  <div className="bg-slate-50 rounded-xl p-3 border border-slate-100 flex flex-col gap-2">
                      <div className="flex gap-2">
                          <span className="text-[9px] font-black text-slate-400 uppercase w-14 shrink-0 pt-0.5">Contains</span>
                          <span className="text-[10px] font-bold text-slate-800 leading-tight">{details.ingredients}</span>
                      </div>
                      <div className="flex gap-2 border-t border-slate-200/50 pt-2">
                          <span className="text-[9px] font-black text-slate-400 uppercase w-14 shrink-0 pt-0.5">Nutrition</span>
                          <span className="text-[10px] font-bold text-slate-800 leading-tight">{details.nutrition}</span>
                      </div>
                  </div>
              </div>
           )}
        </div>

        {/* Footer Actions */}
        <div className="mt-4 flex items-center gap-3 pt-3 border-t border-slate-50">
             <div className="flex items-center gap-2 bg-slate-100 rounded-xl px-2 py-2">
                 <button onClick={() => setQuantity(q => Math.max(1, q-1))} className="w-7 h-7 bg-white rounded-lg shadow-sm text-lg font-bold text-slate-600 hover:text-red-500 transition-colors flex items-center justify-center">-</button>
                 <span className="text-sm font-black text-slate-800 w-4 text-center">{quantity}</span>
                 <button onClick={() => setQuantity(q => q+1)} className="w-7 h-7 bg-white rounded-lg shadow-sm text-lg font-bold text-slate-600 hover:text-brand-DEFAULT transition-colors flex items-center justify-center">+</button>
             </div>
             
             <button 
               onClick={() => { onAdd(product, quantity, currentBrandName, finalPrice, currentVariant); onClose(); }}
               className="flex-1 py-3 bg-slate-900 text-white rounded-xl font-black shadow-lg active:scale-[0.98] transition-all flex justify-center items-center gap-2 text-xs"
             >
               Add to Cart <span className="opacity-60 text-[10px] font-medium">• ₹{finalPrice * quantity}</span>
             </button>
        </div>
      </div>
    </div>
  );
};
