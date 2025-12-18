
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
              <div className="w-24 h-24 bg-slate-100 rounded-full flex items-center justify-center text-5xl mb-6 shadow-soft">
                  🚀
              </div>
              <h2 className="text-2xl font-black text-slate-800 mb-2">Services Starting Soon</h2>
              <p className="text-sm text-slate-500 font-medium leading-relaxed max-w-xs">
                  We are currently onboarding partners in your area. 
                  Grocesphere will be live here very soon!
              </p>
              <div className="mt-8 bg-brand-light/50 p-4 rounded-xl border border-brand-light">
                  <p className="text-xs font-bold text-brand-dark uppercase tracking-wide">Coming to</p>
                  <p className="font-bold text-slate-800 mt-1">{user.address || 'Your Location'}</p>
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
            <div className="grid grid-cols-2 gap-3 pb-20">
                {[...Array(6)].map((_, i) => (
                    <div key={i} className="bg-white rounded-[20px] p-3 h-56 animate-pulse">
                        <div className="w-full aspect-square bg-slate-100 rounded-2xl mb-3"></div>
                        <div className="h-3 w-3/4 bg-slate-100 rounded mb-2"></div>
                        <div className="h-2 w-1/2 bg-slate-100 rounded mb-4"></div>
                    </div>
                ))}
            </div>
        );
    }

    if (filteredProducts.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center py-10 opacity-70 text-center px-6">
                <span className="text-4xl mb-3 bg-slate-100 p-4 rounded-full">🔍</span>
                <p className="text-sm font-bold text-slate-800">No items found.</p>
                <p className="text-xs text-slate-500 mt-1 max-w-xs mx-auto">Try checking another store!</p>
            </div>
        );
    }

    return (
        <div className="grid grid-cols-2 gap-3 pb-20 animate-fade-in">
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
    <div className="space-y-6 animate-fade-in pt-4">
      <div className="flex gap-2">
          <input 
              type="text" 
              placeholder={activeStore ? `Search in ${activeStore.name}...` : "Finding stores..."}
              disabled={!activeStore}
              className="flex-1 p-4 bg-white rounded-2xl shadow-sm text-sm font-bold outline-none focus:ring-2 focus:ring-brand-DEFAULT/50 transition-all disabled:opacity-50"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
          />
          <button 
             onClick={() => setShowFavoritesOnly(!showFavoritesOnly)}
             className={`px-4 rounded-2xl border transition-all duration-300 flex items-center justify-center shadow-sm ${showFavoritesOnly ? 'bg-red-50 border-red-200 text-red-500 shadow-md' : 'bg-white border-transparent text-slate-300'}`}
          >
             <span className="text-xl">{showFavoritesOnly ? '❤️' : '🤍'}</span>
          </button>
      </div>
      
      <div className="rounded-[2rem] overflow-hidden border border-white shadow-card relative group bg-white">
           <div className="h-40 relative">
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
                       <div className={`w-10 h-10 rounded-full flex items-center justify-center text-xl shadow-inner ${
                            activeStore.type === 'produce' ? 'bg-emerald-50 text-emerald-600' : 
                            activeStore.type === 'dairy' ? 'bg-blue-50 text-blue-600' : 'bg-orange-50 text-orange-600'
                       }`}>
                            {activeStore.type === 'produce' ? '🥦' : activeStore.type === 'dairy' ? '🥛' : '🏪'}
                       </div>
                       <div>
                           <div className="flex items-center gap-2">
                               <h2 className="font-black text-slate-800 text-sm">{activeStore.name}</h2>
                               <span className={`text-[8px] font-black px-1.5 py-0.5 rounded uppercase ${activeStore.store_type === 'local_ecommerce' ? 'bg-purple-900 text-white' : 'bg-slate-900 text-white'}`}>
                                   {activeStore.store_type === 'local_ecommerce' ? 'E-Comm' : 'Grocery'}
                               </span>
                           </div>
                           <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">
                               {getStoreTypeLabel(activeStore.type, activeStore.store_type)} • {activeStore.distance}
                           </p>
                       </div>
                   </div>
                   <div className="text-right">
                       <span className="text-xs font-black text-slate-900 block">⭐ {activeStore.rating}</span>
                   </div>
               </div>
           )}
      </div>

      {activeOrder && (
          <div 
             onClick={() => setCurrentView('ORDERS')}
             className="bg-slate-900 text-white p-4 rounded-2xl shadow-float flex items-center justify-between cursor-pointer animate-slide-up hover:scale-[1.02] transition-transform mx-1"
          >
             <div className="flex items-center gap-3">
                 <div className="w-10 h-10 bg-white/10 rounded-full flex items-center justify-center animate-pulse">
                     🛵
                 </div>
                 <div>
                     <p className="text-[10px] font-bold text-brand-DEFAULT uppercase tracking-wider mb-0.5">Track Your Order</p>
                     <p className="text-sm font-black">{activeOrder.status}</p>
                 </div>
             </div>
             <div className="text-right">
                 <span className="text-xs font-bold text-white bg-white/10 px-2 py-1 rounded-lg">View →</span>
             </div>
          </div>
      )}

      {activeStore && !searchTerm && !showFavoritesOnly && !isProductLoading && (
        <div className="grid grid-cols-4 gap-2">
        {PRODUCT_FAMILIES.filter(f => isFamilyAvailable(f.id)).map((family) => {
            const isSelected = selectedFamilyId === family.id;
            return (
            <button
                key={family.id}
                onClick={() => setSelectedFamilyId(isSelected ? null : family.id)}
                className={`relative p-2 rounded-2xl border transition-all duration-300 flex flex-col items-center gap-1 ${isSelected ? 'bg-slate-800 border-slate-900 shadow-lg scale-[1.02]' : `${family.theme} hover:scale-[1.02] bg-white`}`}
            >
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-lg shadow-sm ${isSelected ? 'bg-white/10 text-white' : 'bg-white'}`}>{family.emoji}</div>
                <span className={`text-[9px] font-black uppercase tracking-wide ${isSelected ? 'text-white' : ''}`}>{family.title}</span>
            </button>
            );
        })}
        </div>
      )}

      <div className="pb-10">
          <div className="flex items-center justify-between mb-4 px-1">
                <div className="flex flex-col">
                    <h2 className="text-xl font-black text-slate-800 flex items-center gap-2">
                        {showFavoritesOnly ? 'Your Favorites' : (searchTerm ? 'Search Results' : 'Fresh Picks')}
                    </h2>
                    {activeStore && (
                        <span className="text-[10px] text-slate-400 font-medium uppercase tracking-wide">
                            {activeStore.store_type === 'grocery' ? 'Direct from Mart' : 'Local Business Partner'}
                        </span>
                    )}
                </div>
                {!isProductLoading && (
                    <span className="text-xs font-bold text-slate-400 bg-slate-100 px-2 py-1 rounded-lg">{filteredProducts.length} items</span>
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
