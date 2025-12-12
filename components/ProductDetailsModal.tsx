
import React, { useEffect, useState } from 'react';
import { Product, CartItem } from '../types';
import { generateProductDetails } from '../services/geminiService';

interface ProductDetailsModalProps {
  product: Product;
  cart: CartItem[];
  activeStoreId?: string;
  onClose: () => void;
  onAdd: (product: Product, quantity: number, brand?: string, price?: number, mrp?: number) => void;
  onUpdateQuantity: (cartId: string, delta: number) => void;
  onUpdateDetails?: (id: string, details: Partial<Product>) => void;
}

export const ProductDetailsModal: React.FC<ProductDetailsModalProps> = ({ 
    product, 
    cart,
    activeStoreId,
    onClose, 
    onAdd, 
    onUpdateQuantity,
    onUpdateDetails 
}) => {
  const [details, setDetails] = useState<Partial<Product>>({
    description: product.description,
    ingredients: product.ingredients,
    nutrition: product.nutrition
  });
  
  const [loading, setLoading] = useState(!product.description || !product.ingredients || !product.nutrition);
  
  // State for Generic (Single Brand) mode
  const [quantity, setQuantity] = useState(1);
  const hasBrands = product.brands && product.brands.length > 0;

  // Generic Mode Helpers
  const genericBrand = { name: 'Generic', price: product.price, mrp: product.mrp };
  const currentPrice = product.price;
  const currentMrp = product.mrp;
  const discount = currentMrp && currentMrp > currentPrice 
      ? Math.round(((currentMrp - currentPrice) / currentMrp) * 100) 
      : 0;

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

  // Helper to get quantity of a specific brand in cart
  const getBrandQty = (brandName: string) => {
      if (!activeStoreId) return 0;
      const id = `${product.id}-${brandName}-${activeStoreId}`;
      const item = cart.find(i => i.id === id);
      return item ? item.quantity : 0;
  };

  const getCartId = (brandName: string) => `${product.id}-${brandName}-${activeStoreId}`;

  return (
    <div className="fixed inset-0 z-[80] flex items-end sm:items-center justify-center sm:px-4">
      <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-md animate-fade-in" onClick={onClose} />

      <div className="relative w-full max-w-sm bg-white rounded-t-[3rem] sm:rounded-[3rem] shadow-2xl animate-slide-up overflow-hidden max-h-[90vh] flex flex-col">
        
        {/* Scrollable Content */}
        <div className="overflow-y-auto hide-scrollbar flex-1 pb-4">
            {/* Background Blob */}
            <div className="absolute top-0 left-0 right-0 h-72 bg-gradient-to-b from-brand-light to-white -z-10"></div>
            
            {/* Close */}
            <button onClick={onClose} className="absolute top-6 right-6 w-10 h-10 flex items-center justify-center bg-white/50 backdrop-blur rounded-full text-slate-500 hover:bg-white hover:text-slate-800 transition-all z-20 shadow-sm">✕</button>

            {/* Hero */}
            <div className="flex flex-col items-center pt-10 px-8">
            <div className="relative group">
                {/* 3D Sticker Effect Container */}
                <div className="w-48 h-48 flex items-center justify-center text-[7rem] mb-4 animate-float drop-shadow-2xl filter emoji-real">
                    {product.emoji}
                </div>
                {/* Only show hero discount if single variant */}
                {!hasBrands && discount > 0 && (
                    <div className="absolute -right-2 top-4 bg-brand-dark text-white font-black text-sm px-4 py-2 rounded-xl shadow-lg rotate-12 transform group-hover:rotate-6 transition-transform">
                        {discount}% OFF
                    </div>
                )}
            </div>

            <h2 className="text-3xl font-black text-slate-900 text-center tracking-tight leading-none mb-2 mt-4">{product.name}</h2>
            
            {!hasBrands ? (
                <div className="flex items-baseline gap-2">
                    <p className="text-3xl font-black text-brand-DEFAULT">₹{currentPrice}</p>
                    {currentMrp && currentMrp > currentPrice && (
                        <p className="text-lg font-bold text-slate-400 line-through">₹{currentMrp}</p>
                    )}
                </div>
            ) : (
                <div className="text-sm font-bold text-slate-400 uppercase tracking-widest mt-1">Select Variant Below</div>
            )}
            </div>

            {/* AI Details */}
            <div className="px-8 mt-6 min-h-[4rem]">
                {loading ? (
                    <div className="text-center py-4 opacity-50 space-y-2">
                        <div className="animate-spin text-2xl">✨</div>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Consulting AI Chef...</p>
                    </div>
                ) : (
                    <div className="animate-fade-in space-y-4">
                        <p className="text-center text-slate-600 font-medium leading-relaxed">
                            {details.description}
                        </p>
                        
                        <div className="grid grid-cols-2 gap-3">
                            <div className="bg-slate-50 p-4 rounded-3xl border border-slate-100">
                                <span className="block text-[10px] font-bold text-slate-400 uppercase mb-1 tracking-wide">Ingredients</span>
                                <span className="text-xs font-bold text-slate-800 leading-snug block">{details.ingredients}</span>
                            </div>
                            <div className="bg-slate-50 p-4 rounded-3xl border border-slate-100">
                                <span className="block text-[10px] font-bold text-slate-400 uppercase mb-1 tracking-wide">Nutrition</span>
                                <span className="text-xs font-bold text-slate-800 leading-snug block">{details.nutrition}</span>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* === MULTI-BRAND LIST MODE === */}
            {hasBrands && (
                <div className="px-6 mt-8 space-y-3 pb-8">
                    <div className="flex items-center gap-2 mb-2 px-2">
                        <svg className="w-5 h-5 text-slate-800" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" /></svg>
                        <h3 className="font-black text-slate-800">Available Brands</h3>
                    </div>
                    
                    {product.brands?.map((brand, idx) => {
                        const bQty = getBrandQty(brand.name);
                        const bMrp = brand.mrp || product.mrp || 0;
                        const bDiscount = bMrp > brand.price ? Math.round(((bMrp - brand.price) / bMrp) * 100) : 0;

                        return (
                            <div key={idx} className="bg-white border border-slate-100 rounded-2xl p-4 shadow-sm flex justify-between items-center transition-all hover:border-brand-light hover:shadow-md">
                                <div>
                                    <div className="font-bold text-slate-900 text-sm mb-1">{brand.name}</div>
                                    <div className="flex items-center gap-2">
                                        <span className="font-black text-lg text-slate-900">₹{brand.price}</span>
                                        {bMrp > brand.price && (
                                            <span className="text-xs text-slate-400 line-through decoration-slate-300">₹{bMrp}</span>
                                        )}
                                        {bDiscount > 0 && (
                                            <span className="text-[10px] font-bold bg-green-100 text-green-700 px-1.5 py-0.5 rounded ml-1">{bDiscount}% OFF</span>
                                        )}
                                    </div>
                                </div>

                                {/* Per-Brand Quantity Control */}
                                <div className="h-10">
                                    {bQty === 0 ? (
                                        <button 
                                            onClick={() => onAdd(product, 1, brand.name, brand.price, brand.mrp)}
                                            className="h-full px-5 bg-slate-100 text-slate-600 rounded-xl text-xs font-black hover:bg-brand-DEFAULT hover:text-white transition-all shadow-sm active:scale-95 touch-manipulation uppercase tracking-wide"
                                        >
                                            Add
                                        </button>
                                    ) : (
                                        <div className="flex items-center bg-slate-900 text-white rounded-xl h-full shadow-lg animate-scale-in p-1">
                                            <button 
                                                onClick={() => onUpdateQuantity(getCartId(brand.name), -1)}
                                                className="w-8 h-full flex items-center justify-center hover:bg-white/10 rounded-lg transition-colors font-bold text-lg active:scale-90"
                                            >
                                                -
                                            </button>
                                            <span className="w-8 text-center text-sm font-black">{bQty}</span>
                                            <button 
                                                onClick={() => onAdd(product, 1, brand.name, brand.price, brand.mrp)}
                                                className="w-8 h-full flex items-center justify-center hover:bg-white/10 rounded-lg transition-colors font-bold text-lg active:scale-90"
                                            >
                                                +
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>

        {/* === SINGLE BRAND STICKY FOOTER === */}
        {!hasBrands && (
            <div className="p-6 bg-white border-t border-slate-100 flex items-center gap-4 shrink-0">
                <div className="flex items-center gap-4 bg-slate-100 rounded-2xl px-4 py-3 shadow-inner">
                    <button onClick={() => setQuantity(q => Math.max(1, q-1))} className="w-8 h-8 bg-white rounded-xl shadow-sm text-lg font-bold text-slate-600 hover:text-red-500 transition-colors flex items-center justify-center">-</button>
                    <span className="text-xl font-black text-slate-800 w-6 text-center">{quantity}</span>
                    <button onClick={() => setQuantity(q => q+1)} className="w-8 h-8 bg-white rounded-xl shadow-sm text-lg font-bold text-slate-600 hover:text-brand-DEFAULT transition-colors flex items-center justify-center">+</button>
                </div>
                
                <button 
                    onClick={() => { onAdd(product, quantity, genericBrand.name, genericBrand.price, genericBrand.mrp); onClose(); }}
                    className="flex-1 py-4 bg-slate-900 text-white rounded-2xl font-black shadow-xl hover:scale-[1.02] active:scale-[0.98] transition-all flex justify-center items-center gap-2"
                >
                    Add to Cart <span className="opacity-60 text-sm font-medium">• ₹{currentPrice * quantity}</span>
                </button>
            </div>
        )}

      </div>
    </div>
  );
};
