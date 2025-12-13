
import React, { useState, useMemo } from 'react';
import { useStore } from '../contexts/StoreContext';
import { StickerProduct } from '../components/StickerProduct';
import { MapVisualizer } from '../components/MapVisualizer';
import { ProductDetailsModal } from '../components/ProductDetailsModal';

export const ShopPage: React.FC = () => {
  const { 
    user, activeStore, setActiveStore, availableStores, 
    products, cart, addToCart, updateQuantity, orderMode, detectLocation 
  } = useStore();

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [selectedProduct, setSelectedProduct] = useState<any>(null);

  const uniqueCategories = useMemo(() => {
    return Array.from(new Set(products.map(p => p.category)));
  }, [products]);

  const renderProductView = () => {
    if (searchTerm) {
        const results = products.filter(p => p.name.toLowerCase().includes(searchTerm.toLowerCase()));
        if (results.length === 0) return <div className="text-center py-10 text-slate-400 font-bold">No items found</div>;
        return (
            <div className="grid grid-cols-2 gap-3 pb-20">
                {results.map(product => (
                    <StickerProduct 
                        key={product.id} product={product} 
                        onAdd={(p) => addToCart(p)}
                        onUpdateQuantity={(id, delta) => updateQuantity(`${product.id}-Generic-${activeStore?.id}`, delta)}
                        onClick={setSelectedProduct}
                        count={cart.filter(item => item.originalProductId === product.id).reduce((s,i) => s + i.quantity, 0)}
                    />
                ))}
            </div>
        );
    }

    if (selectedCategory !== 'All') {
        const filtered = products.filter(p => p.category === selectedCategory);
        return (
            <div className="grid grid-cols-2 gap-3 pb-20 animate-fade-in">
                {filtered.map(product => (
                    <StickerProduct 
                        key={product.id} product={product} 
                        onAdd={(p) => addToCart(p)}
                        onUpdateQuantity={(id, delta) => updateQuantity(`${product.id}-Generic-${activeStore?.id}`, delta)}
                        onClick={setSelectedProduct}
                        count={cart.filter(item => item.originalProductId === product.id).reduce((s,i) => s + i.quantity, 0)}
                    />
                ))}
            </div>
        );
    }

    return (
        <div className="space-y-8 pb-24">
            {uniqueCategories.map(category => {
                const categoryProducts = products.filter(p => p.category === category);
                if (categoryProducts.length === 0) return null;
                return (
                    <div key={category} className="animate-fade-in">
                        <div className="flex items-center justify-between mb-4 px-1">
                             <h3 className="font-black text-slate-800 text-lg flex items-center gap-2">
                                {category}
                                <span className="bg-slate-100 text-slate-400 text-[10px] px-2 py-0.5 rounded-full">{categoryProducts.length}</span>
                             </h3>
                             <button onClick={() => setSelectedCategory(category)} className="text-xs font-bold text-brand-DEFAULT hover:text-brand-dark">See all</button>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            {categoryProducts.map(product => (
                                <StickerProduct 
                                    key={product.id} product={product} 
                                    onAdd={(p) => addToCart(p)}
                                    onUpdateQuantity={(id, delta) => updateQuantity(`${product.id}-Generic-${activeStore?.id}`, delta)}
                                    onClick={setSelectedProduct}
                                    count={cart.filter(item => item.originalProductId === product.id).reduce((s,i) => s + i.quantity, 0)}
                                />
                            ))}
                        </div>
                    </div>
                );
            })}
        </div>
    );
  };

  return (
    <div className="space-y-6 animate-fade-in pt-4">
      <input 
          type="text" 
          placeholder="Search items..." 
          className="w-full p-4 bg-white rounded-2xl shadow-sm text-sm font-bold outline-none"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
      />
      
      <div className="h-40 rounded-[2rem] overflow-hidden border border-white shadow-card">
           <MapVisualizer 
              stores={availableStores} 
              userLat={user.location?.lat || 0}
              userLng={user.location?.lng || 0}
              selectedStore={activeStore}
              onSelectStore={setActiveStore}
              mode={orderMode}
              className="h-full"
              onRequestLocation={detectLocation}
          />
      </div>

      <div className="flex gap-2 overflow-x-auto pb-2 hide-scrollbar -mx-4 px-4">
          <button onClick={() => setSelectedCategory('All')} className={`px-5 py-2.5 rounded-full text-xs font-black whitespace-nowrap transition-all shadow-sm border ${selectedCategory === 'All' ? 'bg-slate-900 text-white border-slate-900 ring-2 ring-slate-200' : 'bg-white text-slate-500 border-slate-100 hover:border-slate-300'}`}>All</button>
          {uniqueCategories.map(cat => (
            <button key={cat} onClick={() => setSelectedCategory(cat)} className={`px-5 py-2.5 rounded-full text-xs font-black whitespace-nowrap transition-all shadow-sm border ${selectedCategory === cat ? 'bg-slate-900 text-white border-slate-900 ring-2 ring-slate-200' : 'bg-white text-slate-500 border-slate-100 hover:border-slate-300'}`}>{cat}</button>
          ))}
      </div>

      {renderProductView()}

      {selectedProduct && (
        <ProductDetailsModal 
          product={selectedProduct} 
          onClose={() => setSelectedProduct(null)} 
          onAdd={addToCart} 
        />
      )}
    </div>
  );
};
