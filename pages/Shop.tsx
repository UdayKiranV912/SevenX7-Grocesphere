
import React, { useState, useEffect } from 'react';
import { useStore } from '../contexts/StoreContext';
import { StickerProduct } from '../components/StickerProduct';
import { MapVisualizer } from '../components/MapVisualizer';
import { ProductDetailsModal } from '../components/ProductDetailsModal';
import { PRODUCT_FAMILIES } from '../constants';

export const ShopPage: React.FC = () => {
  const { 
    user, activeStore, setActiveStore, availableStores, 
    products, cart, addToCart, updateQuantity, orderMode, detectLocation,
    isFavorite, toggleFavorite, isProductLoading,
    activeOrder, setCurrentView, setViewingProduct
  } = useStore();

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedFamilyId, setSelectedFamilyId] = useState<string | null>(null);
  const [selectedProduct, setSelectedProduct] = useState<any>(null);
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);

  useEffect(() => {
    if (selectedProduct) {
        setViewingProduct(selectedProduct);
        window.history.pushState({ modal: 'PRODUCT' }, '');
        const handlePop = () => {
            setSelectedProduct(null);
            setViewingProduct(null);
        };
        window.addEventListener('popstate', handlePop);
        return () => window.removeEventListener('popstate', handlePop);
    } else {
        setViewingProduct(null);
    }
  }, [selectedProduct, setViewingProduct]);

  const closeProductModal = () => {
      setSelectedProduct(null);
      setViewingProduct(null);
      if (window.history.state?.modal === 'PRODUCT') {
          window.history.back();
      }
  };

  if (!activeStore && availableStores.length === 0 && !isProductLoading) {
      return (
          <div className="flex flex-col items-center justify-center min-h-[70vh] px-8 text-center animate-fade-in">
              <div className="w-24 h-24 bg-slate-100 rounded-[32px] flex items-center justify-center text-5xl mb-6 shadow-soft transform -rotate-3">
                  🚀
              </div>
              <h2 className="text-2xl font-black text-slate-800 mb-2 tracking-tight">Services Coming Soon</h2>
              <p className="text-xs text-slate-500 font-bold leading-relaxed max-w-xs mb-8">
                  Currently onboarding partners in your area. Live very soon!
              </p>
              <div className="w-full bg-brand-light/40 p-4 rounded-[24px] border-2 border-brand-light border-dashed">
                  <p className="text-[9px] font-black text-brand-dark uppercase tracking-widest mb-0.5">Target Area</p>
                  <p className="font-black text-slate-800 text-sm">{user.address || 'Your Current Location'}</p>
              </div>
          </div>
      );
  }

  const isFamilyAvailable = (familyId: string) => {
     if (!products || products.length === 0) return false;
     const family = PRODUCT_FAMILIES.find(f => f.id === familyId);
     return family ? products.some(p => family.filter(p)) : false;
  };

  const filteredProducts = products.filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          p.category.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFamily = selectedFamilyId 
        ? PRODUCT_FAMILIES.find(f => f.id === selectedFamilyId)?.filter(p)
        : true;
    const matchesFav = showFavoritesOnly ? isFavorite(p.id) : true;
    return matchesSearch && matchesFamily && matchesFav;
  });

  const getStoreTypeLabel = (type?: string, storeType?: string) => {
      const base = type === 'produce' ? 'Farm Fresh' : type === 'dairy' ? 'Dairy Parlour' : 'General Store';
      const mode = storeType === 'local_ecommerce' ? 'E-Commerce' : 'Grocery';
      return `${base} • ${mode}`;
  };

  const renderProductView = () => {
    if (isProductLoading) {
        return (
            <div className="grid grid-cols-2 gap-3 pb-20 px-3">
                {[...Array(6)].map((_, i) => (
                    <div key={i} className="bg-white rounded-[24px] p-3 h-56 animate-pulse">
                        <div className="w-full aspect-square bg-slate-100 rounded-2xl mb-3"></div>
                        <div className="h-2.5 w-3/4 bg-slate-100 rounded-full mb-2"></div>
                        <div className="h-2.5 w-1/2 bg-slate-100 rounded-full"></div>
                    </div>
                ))}
            </div>
        );
    }

    if (filteredProducts.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center py-12 opacity-70 text-center px-6">
                <div className="text-5xl mb-4 bg-slate-100 p-6 rounded-[32px]">🔍</div>
                <p className="text-base font-black text-slate-800">No items found.</p>
                <p className="text-xs text-slate-400 mt-1 max-w-xs mx-auto font-bold">Try different filters or search terms!</p>
            </div>
        );
    }

    return (
        <div className="grid grid-cols-2 gap-3 pb-24 animate-fade-in px-3">
            {filteredProducts.map(product => (
                <StickerProduct 
                    key={product.id} 
                    product={product} 
                    onAdd={addToCart}
                    onUpdateQuantity={(id, delta) => updateQuantity(`${product.id}-Generic-${activeStore?.id}`, delta)}
                    onClick={setSelectedProduct}
                    count={cart.filter(item => item.originalProductId === product.id).reduce((s,i) => s + i.quantity, 0)}
                    isFavorite={isFavorite(product.id)}
                    onToggleFavorite={toggleFavorite}
                />
            ))}
        </div>
    );
  };

  return (
    <div className="space-y-3.5 animate-fade-in pt-3">
      {/* Search Header */}
      <div className="flex gap-2.5 px-3">
          <div className="flex-1 relative">
            <input 
                type="text" 
                placeholder={activeStore ? `Find in ${activeStore.name}...` : "Searching..."}
                disabled={!activeStore}
                className="w-full p-3.5 bg-white rounded-[20px] shadow-soft text-xs font-black outline-none border-2 border-transparent focus:border-brand-DEFAULT/30 transition-all disabled:opacity-50"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
            />
            <div className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-300">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
            </div>
          </div>
          <button 
             onClick={() => setShowFavoritesOnly(!showFavoritesOnly)}
             className={`w-12 rounded-[20px] border-2 transition-all duration-300 flex items-center justify-center shadow-soft ${showFavoritesOnly ? 'bg-red-50 border-red-200 text-red-500 shadow-md scale-105' : 'bg-white border-transparent text-slate-300'}`}
          >
             <span className="text-xl">{showFavoritesOnly ? '❤️' : '🤍'}</span>
          </button>
      </div>
      
      {/* Map & Store Container */}
      <div className="mx-3 rounded-[32px] overflow-hidden border-2 border-white shadow-soft relative bg-white">
           <div className="h-36 relative">
                <MapVisualizer 
                    stores={availableStores} 
                    userLat={user.location?.lat || 0}
                    userLng={user.location?.lng || 0}
                    selectedStore={activeStore}
                    onSelectStore={setActiveStore}
                    mode={orderMode}
                    className="h-full rounded-b-none"
                    onRequestLocation={detectLocation}
                />
           </div>
           
           {activeStore && (
               <div className="px-4 py-3 bg-white flex items-center justify-between border-t border-slate-50">
                   <div className="flex items-center gap-3">
                       <div className={`w-9 h-9 rounded-xl flex items-center justify-center text-xl shadow-soft ${
                            activeStore.type === 'produce' ? 'bg-emerald-50 text-emerald-600' : 
                            activeStore.type === 'dairy' ? 'bg-blue-50 text-blue-600' : 'bg-orange-50 text-orange-600'
                       }`}>
                            {activeStore.type === 'produce' ? '🥦' : activeStore.type === 'dairy' ? '🥛' : '🏪'}
                       </div>
                       <div>
                           <div className="flex items-center gap-1.5 mb-0.5">
                               <h2 className="font-black text-slate-900 text-xs">{activeStore.name}</h2>
                               <span className={`text-[8px] font-black px-1.5 py-0.5 rounded-full uppercase tracking-tighter ${activeStore.store_type === 'local_ecommerce' ? 'bg-indigo-900 text-white' : 'bg-slate-900 text-white'}`}>
                                   {activeStore.store_type === 'local_ecommerce' ? 'E-Comm' : 'Grocer'}
                               </span>
                           </div>
                           <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest leading-none">
                               {activeStore.distance} • {activeStore.type === 'produce' ? 'Farm Fresh' : 'Community Mart'}
                           </p>
                       </div>
                   </div>
                   <div className="text-right">
                       <span className="text-[10px] font-black text-slate-900 block bg-slate-50 px-2 py-1 rounded-lg border border-slate-100">⭐ {activeStore.rating}</span>
                   </div>
               </div>
           )}
      </div>

      {activeOrder && (
          <div 
             onClick={() => setCurrentView('ORDERS')}
             className="mx-3 bg-slate-900 text-white p-3.5 rounded-[24px] shadow-float flex items-center justify-between cursor-pointer animate-slide-up"
          >
             <div className="flex items-center gap-3">
                 <div className="w-9 h-9 bg-white/10 rounded-xl flex items-center justify-center animate-bounce-soft text-lg">
                     🛵
                 </div>
                 <div>
                     <p className="text-[8px] font-black text-brand-DEFAULT uppercase tracking-[0.2em] mb-0.5">Live Track</p>
                     <p className="text-xs font-black">{activeOrder.status}</p>
                 </div>
             </div>
             <span className="text-[9px] font-black text-white bg-white/10 px-3 py-1.5 rounded-lg uppercase">Track →</span>
          </div>
      )}

      {/* Categories */}
      {activeStore && !searchTerm && !showFavoritesOnly && !isProductLoading && (
        <div className="grid grid-cols-4 gap-2.5 px-3">
        {PRODUCT_FAMILIES.filter(f => isFamilyAvailable(f.id)).map((family) => {
            const isSelected = selectedFamilyId === family.id;
            return (
            <button
                key={family.id}
                onClick={() => setSelectedFamilyId(isSelected ? null : family.id)}
                className={`relative p-2.5 rounded-[20px] border-2 transition-all duration-500 flex flex-col items-center gap-1.5 ${isSelected ? 'bg-slate-900 border-slate-900 shadow-lg scale-105' : `${family.theme} bg-white border-transparent`}`}
            >
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-lg shadow-soft ${isSelected ? 'bg-white/10 text-white' : 'bg-white'}`}>{family.emoji}</div>
                <span className={`text-[8px] font-black uppercase tracking-wider ${isSelected ? 'text-white' : 'text-slate-600'}`}>{family.title}</span>
            </button>
            );
        })}
        </div>
      )}

      {/* Main Section */}
      <div className="pb-12">
          <div className="flex items-end justify-between mb-4 px-4">
                <div className="flex flex-col">
                    <h2 className="text-lg font-black text-slate-900 tracking-tight leading-none">
                        {showFavoritesOnly ? 'Favorites' : (searchTerm ? 'Results' : 'Daily Fresh')}
                    </h2>
                    {activeStore && (
                        <span className="text-[8px] text-slate-400 font-black uppercase tracking-[0.2em] mt-1">
                            Local Community Inventory
                        </span>
                    )}
                </div>
                {!isProductLoading && (
                    <span className="text-[8px] font-black text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full uppercase tracking-tighter">
                        {filteredProducts.length} Items
                    </span>
                )}
          </div>
          {renderProductView()}
      </div>

      {selectedProduct && (
        <ProductDetailsModal 
          product={selectedProduct} 
          onClose={closeProductModal} 
          onAdd={addToCart} 
        />
      )}
    </div>
  );
};
