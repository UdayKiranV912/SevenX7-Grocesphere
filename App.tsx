
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { INITIAL_PRODUCTS, MOCK_STORES } from './constants';
import { Product, Store, CartItem, OrderMode, UserState, Order, DeliveryType } from './types';
import { findNearbyStores } from './services/geminiService';
import { fetchLiveStores, fetchStoreProducts, subscribeToStoreInventory } from './services/storeService';
import { saveOrder } from './services/orderService'; 
import { Auth } from './components/OTPVerification'; 
import { StickerProduct } from './components/StickerProduct';
import { CartSheet, CartDetails } from './components/CartSheet';
import { MapVisualizer } from './components/MapVisualizer';
import { MyOrders } from './components/MyOrders';
import { ProductDetailsModal } from './components/ProductDetailsModal';
import { PaymentGateway } from './components/PaymentGateway';
import { UserProfile } from './components/UserProfile';
import SevenX7Logo from './components/SevenX7Logo';

// Define Product Families with updated styling and SVG icons for UI representation
const PRODUCT_FAMILIES = [
  { 
    id: 'grains', 
    title: 'Grains', 
    emoji: '🌾', 
    theme: 'bg-orange-50',
    filter: (p: Product) => p.category === 'Staples' && parseInt(p.id) <= 10
  },
  { 
    id: 'pulses', 
    title: 'Pulses', 
    emoji: '🫘', 
    theme: 'bg-amber-50',
    filter: (p: Product) => p.category === 'Staples' && parseInt(p.id) > 10
  },
  { 
    id: 'oils', 
    title: 'Oils', 
    emoji: '🏺', 
    theme: 'bg-yellow-50',
    filter: (p: Product) => p.category === 'Oils & Spices'
  },
  { 
    id: 'dairy', 
    title: 'Dairy', 
    emoji: '🥛', 
    theme: 'bg-blue-50',
    filter: (p: Product) => p.category === 'Dairy & Breakfast'
  },
  { 
    id: 'produce', 
    title: 'Fresh', 
    emoji: '🥦', 
    theme: 'bg-emerald-50',
    filter: (p: Product) => p.category === 'Veg & Fruits'
  },
  { 
    id: 'snacks', 
    title: 'Munchies', 
    emoji: '🍿', 
    theme: 'bg-purple-50',
    filter: (p: Product) => p.category === 'Snacks & Drinks'
  },
];

const App: React.FC = () => {
  // State
  const [user, setUser] = useState<UserState>({ isAuthenticated: false, phone: '', location: null });
  
  // Use DB products if available, otherwise fallback
  const [products, setProducts] = useState<Product[]>(INITIAL_PRODUCTS);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [orderMode, setOrderMode] = useState<OrderMode>('DELIVERY');
  const [activeStore, setActiveStore] = useState<Store | null>(MOCK_STORES[0]); 
  const [availableStores, setAvailableStores] = useState<Store[]>(MOCK_STORES);
  const [isLoadingStores, setIsLoadingStores] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedFamilyId, setSelectedFamilyId] = useState<string | null>(null);
  const [deliveryAddress, setDeliveryAddress] = useState('');
  const [currentView, setCurrentView] = useState<'SHOP' | 'CART' | 'ORDERS' | 'PROFILE'>('SHOP');
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [searchSuggestions, setSearchSuggestions] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [showPaymentGateway, setShowPaymentGateway] = useState(false);
  
  // Pending order state (either for new order or paying for existing one)
  const [pendingOrderDetails, setPendingOrderDetails] = useState<{ 
    deliveryType: DeliveryType; 
    scheduledTime?: string;
    isPayLater?: boolean;
    existingOrderId?: string; 
    amount?: number;
    splits?: any; // NEW: Payment Splits
  } | null>(null);
  
  const hasFetchedStores = useRef(false);
  const totalCartItems = cart.reduce((acc, item) => acc + item.quantity, 0);

  // --- LOCATION HANDLING ---
  const handleLocationUpdate = useCallback(async (loc: { lat: number; lng: number; accuracy: number }) => {
      setUser(prev => {
          if (prev.location && Math.abs(prev.location.lat - loc.lat) < 0.0001 && Math.abs(prev.location.lng - loc.lng) < 0.0001) {
              return prev;
          }
          return { ...prev, location: { lat: loc.lat, lng: loc.lng, accuracy: loc.accuracy } };
      });

      if (!hasFetchedStores.current) {
          const isDemoUser = user.id === 'demo-user';
          initializeStores(loc.lat, loc.lng, isDemoUser);
      }

      if (!user.address) {
          try {
              const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${loc.lat}&lon=${loc.lng}&zoom=18&addressdetails=1`);
              const data = await res.json();
              if (data && data.display_name) {
                  const addr = data.display_name.split(',').slice(0, 3).join(','); 
                  setUser(prev => ({ ...prev, address: addr }));
                  setDeliveryAddress(addr);
              }
          } catch (e) {
              console.warn("Auto-address fetch failed");
          }
      }
  }, [user.id, user.address]);

  // Fetch both Registered DB Stores and fallback OSM stores
  const initializeStores = async (lat: number, lng: number, isDemo: boolean) => {
      hasFetchedStores.current = true;
      setIsLoadingStores(true);
      
      try {
          const dbStores = await fetchLiveStores(lat, lng);
          const osmStores = await findNearbyStores(lat, lng);

          const allStores = [...dbStores];
          
          osmStores.forEach(osm => {
             const exists = allStores.some(db => {
                 const dist = Math.sqrt(Math.pow(db.lat - osm.lat, 2) + Math.pow(db.lng - osm.lng, 2));
                 return dist < 0.0005; 
             });
             if (!exists) allStores.push(osm);
          });

          if (isDemo) {
             if (allStores.length < 5) {
                setAvailableStores([...allStores, ...MOCK_STORES]);
                setActiveStore(allStores[0] || MOCK_STORES[0]);
             } else {
                setAvailableStores(allStores);
                setActiveStore(allStores[0]);
             }
          } else {
             if (allStores.length === 0) {
                 setAvailableStores([]); 
                 setActiveStore(null);
             } else {
                 setAvailableStores(allStores);
                 setActiveStore(allStores[0]);
             }
          }
      } catch (e) {
          console.error(e);
          if (isDemo) {
             setAvailableStores(MOCK_STORES);
             setActiveStore(MOCK_STORES[0]);
          }
      } finally {
          setIsLoadingStores(false);
      }
  };

  // --- REAL TIME INVENTORY SYNC ---
  useEffect(() => {
    if (!activeStore) return;

    const loadInventory = async () => {
        const isDbStore = activeStore.id.length > 20 && !activeStore.id.startsWith('osm');
        if (isDbStore) {
            const storeSpecificProducts = await fetchStoreProducts(activeStore.id);
            if (storeSpecificProducts.length > 0) {
                setProducts(prev => {
                    const newProds = [...prev];
                    storeSpecificProducts.forEach(sp => {
                        const idx = newProds.findIndex(p => p.id === sp.id);
                        if (idx >= 0) newProds[idx] = sp;
                        else newProds.push(sp);
                    });
                    return newProds;
                });
            }

            const subscription = subscribeToStoreInventory(activeStore.id, async () => {
                const updated = await fetchStoreProducts(activeStore.id);
                 setProducts(prev => {
                    const newProds = [...prev];
                    updated.forEach(sp => {
                        const idx = newProds.findIndex(p => p.id === sp.id);
                        if (idx >= 0) newProds[idx] = sp;
                    });
                    return newProds;
                });
            });

            return () => { subscription.unsubscribe(); };
        } else {
            setProducts(INITIAL_PRODUCTS);
        }
    };
    loadInventory();
  }, [activeStore]);

  // Search Logic
  useEffect(() => {
    if (searchTerm.length > 0) {
      const term = searchTerm.toLowerCase();
      const availableProducts = activeStore ? products.filter(p => activeStore.availableProductIds.includes(p.id)) : products;

      const prodMatches = availableProducts
        .filter(p => p.name.toLowerCase().includes(term) || p.category.toLowerCase().includes(term))
        .map(p => p.name)
        .slice(0, 4);
      const familyMatches = PRODUCT_FAMILIES
        .filter(f => f.title.toLowerCase().includes(term))
        .map(f => f.title);
      const combined = Array.from(new Set([...prodMatches, ...familyMatches]));
      setSearchSuggestions(combined);
      setShowSuggestions(combined.length > 0);
    } else {
      setShowSuggestions(false);
    }
  }, [searchTerm, products, activeStore]);

  const handleLoginSuccess = (userData: UserState) => {
    setUser(userData);
    if (userData.address) {
        setDeliveryAddress(userData.address);
    }
  };

  const handleDemoLogin = () => {
    setUser({
      isAuthenticated: true,
      id: 'demo-user',
      name: 'Demo User',
      phone: '9999999999',
      location: null,
      address: 'Indiranagar, Bangalore'
    });
    setDeliveryAddress('Indiranagar, Bangalore');
  };

  const handleLogout = () => {
    setUser({ isAuthenticated: false, phone: '', location: null });
    setCart([]);
    setCurrentView('SHOP');
    hasFetchedStores.current = false;
  };

  const addToCart = (product: Product, quantity = 1, brand?: string, brandPrice?: number, brandMrp?: number) => {
    if (!activeStore) {
        alert("Please select a store first.");
        return;
    }
    const selectedBrand = brand || 'Generic';
    const finalPrice = brandPrice || product.price;
    const finalMrp = brandMrp || product.mrp;

    const cartId = `${product.id}-${selectedBrand}-${activeStore.id}`;

    setCart(prev => {
      const existing = prev.find(item => item.id === cartId);
      if (existing) {
        return prev.map(item => item.id === cartId ? { ...item, quantity: item.quantity + quantity } : item);
      }
      return [...prev, { 
          ...product, 
          id: cartId, 
          originalProductId: product.id,
          selectedBrand: selectedBrand,
          price: finalPrice,
          mrp: finalMrp,
          name: brand && brand !== 'Generic' ? `${brand} ${product.name}` : product.name,
          quantity,
          storeId: activeStore.id,
          storeName: activeStore.name,
          storeType: activeStore.type
      }];
    });
  };

  const updateQuantity = (cartId: string, delta: number) => {
    setCart(prev => prev.map(item => {
      if (item.id === cartId) {
        return { ...item, quantity: Math.max(0, item.quantity + delta) };
      }
      return item;
    }).filter(item => item.quantity > 0));
  };

  const handleProceedToPay = (details: { deliveryType: DeliveryType; scheduledTime?: string; isPayLater?: boolean; splits: any }) => {
      setPendingOrderDetails(details);
      if (details.isPayLater) {
          finalizeOrder(details); 
      } else {
          setShowPaymentGateway(true);
      }
  };

  const handlePayForExistingOrder = (order: Order) => {
     setPendingOrderDetails({
         deliveryType: order.deliveryType,
         scheduledTime: order.scheduledTime,
         existingOrderId: order.id,
         amount: order.total
     });
     setShowPaymentGateway(true);
  };

  const finalizeOrder = async (directDetails?: typeof pendingOrderDetails) => {
    const details = directDetails || pendingOrderDetails;
    if (!details) return;

    if (details.existingOrderId) {
        setShowPaymentGateway(false);
        setPendingOrderDetails(null);
        setCurrentView('ORDERS');
        return;
    }

    const deadline = details.scheduledTime 
        ? new Date(new Date(details.scheduledTime).getTime() - 30 * 60000).toISOString()
        : undefined;
    
    // Create one order per store
    const itemsByStore: Record<string, CartItem[]> = {};
    cart.forEach(item => {
        if (!itemsByStore[item.storeId]) itemsByStore[item.storeId] = [];
        itemsByStore[item.storeId].push(item);
    });

    const newOrders: Order[] = Object.entries(itemsByStore).map(([storeId, items]) => {
        const storeItem = items[0];
        const subTotal = items.reduce((acc, item) => acc + (item.price * item.quantity), 0);
        const deliveryFee = details.splits?.deliveryFee || 0;
        const handlingFee = details.splits?.handlingFee || 0;
        const total = subTotal + deliveryFee + handlingFee;

        return {
            id: Date.now().toString() + Math.random().toString(36).substr(2, 5),
            date: new Date().toISOString(),
            items: items,
            total: total,
            status: 'Pending',
            paymentStatus: details.isPayLater ? 'PENDING' : 'PAID',
            paymentDeadline: deadline,
            mode: orderMode,
            deliveryType: details.deliveryType,
            scheduledTime: details.scheduledTime,
            deliveryAddress: orderMode === 'DELIVERY' ? deliveryAddress : undefined,
            storeName: storeItem.storeName,
            storeLocation: { lat: 0, lng: 0 }, 
            userLocation: user.location || undefined,
            splits: details.splits 
        };
    });

    if (user.id === 'demo-user') {
        const existingData = localStorage.getItem('grocesphere_orders');
        const existingOrders = existingData ? JSON.parse(existingData) : [];
        localStorage.setItem('grocesphere_orders', JSON.stringify([...newOrders, ...existingOrders]));
    } else if (user.id) {
        await Promise.all(newOrders.map(order => saveOrder(user.id!, order)));
    }

    setCart([]);
    setShowPaymentGateway(false);
    setPendingOrderDetails(null);
    setCurrentView('ORDERS');
  };

  if (!user.isAuthenticated) {
    return <Auth onLoginSuccess={handleLoginSuccess} onDemoLogin={handleDemoLogin} />;
  }

  if (showPaymentGateway && pendingOrderDetails) {
      let amount = pendingOrderDetails.amount || 0;
      if (!amount && pendingOrderDetails.splits) {
          const s = pendingOrderDetails.splits;
          amount = s.storeAmount + s.deliveryFee + s.handlingFee;
      }
      return (
          <PaymentGateway 
             amount={amount}
             splits={pendingOrderDetails.splits}
             onSuccess={() => finalizeOrder(undefined)}
             onCancel={() => setShowPaymentGateway(false)}
             isDemo={user.id === 'demo-user'}
          />
      );
  }

  const displayedProducts = activeStore 
    ? products.filter(p => activeStore.availableProductIds.includes(p.id)) 
    : products;

  const filteredProducts = displayedProducts.filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          p.category.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFamily = selectedFamilyId 
        ? PRODUCT_FAMILIES.find(f => f.id === selectedFamilyId)?.filter(p)
        : true;
    return matchesSearch && matchesFamily;
  });

  return (
    <div className="min-h-screen bg-[#F8FAFC] font-sans text-slate-900 pb-24">
      
      {/* --- HEADER --- */}
      <header className="sticky top-0 z-40 bg-white/90 backdrop-blur-xl border-b border-slate-100/80 shadow-sm transition-all">
        <div className="max-w-md mx-auto px-4 pt-4 pb-3">
            <div className="flex justify-between items-start">
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 text-brand-dark cursor-pointer group" onClick={() => setCurrentView('PROFILE')}>
                        <div className="bg-brand-light p-2 rounded-full text-brand-DEFAULT group-hover:bg-brand-DEFAULT group-hover:text-white transition-colors">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
                            </svg>
                        </div>
                        <div className="flex flex-col">
                            <h2 className="font-black text-sm truncate leading-tight flex items-center gap-1">
                                {user.address ? user.address.split(',')[0] : 'Locating...'}
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 text-slate-400" viewBox="0 0 20 20" fill="currentColor">
                                    <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                                </svg>
                            </h2>
                            <p className="text-[10px] text-slate-400 font-bold truncate max-w-[200px]">
                                {user.address || 'Detecting GPS location...'}
                            </p>
                        </div>
                    </div>
                </div>
                <button 
                  onClick={() => setCurrentView('PROFILE')}
                  className="w-10 h-10 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-600 font-black text-sm hover:bg-slate-200 transition-colors shadow-sm"
                >
                  {user.name ? user.name.charAt(0).toUpperCase() : 'U'}
                </button>
            </div>
            
            {/* Search Bar */}
            {currentView === 'SHOP' && (
                <div className="mt-4 relative pb-1">
                   <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none pb-1">
                       <svg className="h-5 w-5 text-slate-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                           <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" />
                       </svg>
                   </div>
                   <input 
                      type="text" 
                      placeholder="Search for 'milk', 'chips'..." 
                      className="w-full pl-11 pr-4 py-3 bg-slate-100/50 border border-slate-200 rounded-2xl text-sm font-semibold text-slate-800 placeholder-slate-400 focus:ring-2 focus:ring-brand-DEFAULT/20 focus:bg-white focus:border-brand-light transition-all shadow-inner"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                   />
                </div>
            )}
        </div>
      </header>

      <main className="max-w-md mx-auto relative min-h-screen">
        {currentView === 'SHOP' && (
          <div className="animate-fade-in pb-8">
            
            {/* 1. Map Widget (Full width on mobile) */}
            <div className="px-4 py-6 md:px-0">
                <div className="h-[280px] rounded-[2rem] overflow-hidden shadow-float border border-white/60 relative group">
                     {/* Glass Overlay Top Left */}
                     <div className="absolute top-3 left-3 z-[400] glass-panel px-3 py-1.5 rounded-full shadow-sm flex items-center gap-1.5 pointer-events-none">
                        <span className="relative flex h-2 w-2">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                        </span>
                        <span className="text-[10px] font-black uppercase text-slate-700">Live</span>
                     </div>
                     
                     <MapVisualizer 
                        stores={availableStores} 
                        userLat={user.location?.lat ?? null}
                        userLng={user.location?.lng ?? null}
                        userAccuracy={user.location?.accuracy}
                        selectedStore={activeStore}
                        onSelectStore={setActiveStore}
                        mode={orderMode}
                        showRoute={orderMode === 'DELIVERY'}
                        className="h-full w-full"
                        onLocationUpdate={handleLocationUpdate}
                    />

                    {/* Controls Overlay Bottom */}
                    <div className="absolute bottom-3 right-3 z-[400] flex flex-col gap-2">
                         <div className="glass-panel p-1.5 rounded-xl flex flex-col gap-1 shadow-lg">
                             <button 
                                onClick={() => setOrderMode('DELIVERY')} 
                                className={`w-8 h-8 flex items-center justify-center rounded-lg transition-all ${orderMode === 'DELIVERY' ? 'bg-slate-900 text-white shadow-md' : 'text-slate-400 hover:text-slate-600'}`}
                             >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                             </button>
                             <button 
                                onClick={() => setOrderMode('PICKUP')} 
                                className={`w-8 h-8 flex items-center justify-center rounded-lg transition-all ${orderMode === 'PICKUP' ? 'bg-slate-900 text-white shadow-md' : 'text-slate-400 hover:text-slate-600'}`}
                             >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" /></svg>
                             </button>
                         </div>
                    </div>
                </div>
            </div>

            {/* 2. Categories (Modern Pills) */}
            {!searchTerm && (
                <div className="mb-8">
                    <div className="flex gap-4 overflow-x-auto px-5 pb-4 hide-scrollbar snap-x">
                        {PRODUCT_FAMILIES.map((family) => {
                            const isSelected = selectedFamilyId === family.id;
                            return (
                                <button
                                    key={family.id}
                                    onClick={() => setSelectedFamilyId(isSelected ? null : family.id)}
                                    className="flex flex-col items-center gap-2 min-w-[72px] snap-start group"
                                >
                                    <div className={`w-16 h-16 rounded-[1.2rem] flex items-center justify-center text-3xl shadow-sm border transition-all duration-300 relative overflow-hidden ${isSelected ? 'bg-slate-900 border-slate-900 scale-105 shadow-lg' : `${family.theme} border-transparent group-hover:scale-105 bg-white shadow-sm`}`}>
                                        <div className="absolute inset-0 bg-gradient-to-br from-white/40 to-transparent pointer-events-none"></div>
                                        <div className={`relative z-10 filter drop-shadow-md emoji-real scale-90 ${isSelected ? 'brightness-125' : ''}`}>{family.emoji}</div>
                                    </div>
                                    <span className={`text-[10px] font-bold text-center leading-tight transition-colors ${isSelected ? 'text-slate-900' : 'text-slate-500 group-hover:text-slate-700'}`}>
                                        {family.title}
                                    </span>
                                </button>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* 3. Product Grid */}
            <div className="px-5">
              <div className="flex items-center justify-between mb-5">
                 <h2 className="text-xl font-black text-slate-900 tracking-tight">{searchTerm ? 'Search Results' : selectedFamilyId ? 'Category Items' : 'Recommended'}</h2>
                 <span className="text-[10px] font-bold text-slate-500 bg-white border border-slate-200 px-2.5 py-1 rounded-full shadow-sm">{filteredProducts.length} items</span>
              </div>
              
              <div className="grid grid-cols-2 gap-4 pb-32">
                    {filteredProducts.map((product) => (
                    <StickerProduct 
                        key={product.id} 
                        product={product} 
                        onAdd={(p) => addToCart(p)}
                        onUpdateQuantity={(id, delta) => {
                            const item = cart.find(c => c.originalProductId === product.id && c.storeId === activeStore?.id);
                            if (item) updateQuantity(item.id, delta);
                        }}
                        onClick={(p) => setSelectedProduct(p)}
                        count={cart.filter(item => item.originalProductId === product.id && item.storeId === activeStore?.id).reduce((s,i) => s + i.quantity, 0)}
                    />
                    ))}
              </div>
            </div>
          </div>
        )}

        {currentView === 'CART' && (
           <CartDetails 
              cart={cart}
              onProceedToPay={handleProceedToPay}
              onUpdateQuantity={updateQuantity}
              onAddProduct={(p) => addToCart(p)}
              mode={orderMode}
              onModeChange={setOrderMode}
              deliveryAddress={deliveryAddress}
              onAddressChange={setDeliveryAddress}
              activeStore={activeStore}
              stores={availableStores}
              userLocation={user.location}
              isPage={true}
              onClose={() => setCurrentView('SHOP')}
           />
        )}

        {currentView === 'ORDERS' && (
            <MyOrders 
                userLocation={user.location} 
                onPayNow={handlePayForExistingOrder} 
                userId={user.id} 
                onRequestLocation={() => {
                     if (navigator.geolocation) {
                         navigator.geolocation.getCurrentPosition(
                             (pos) => handleLocationUpdate({ 
                                 lat: pos.coords.latitude, 
                                 lng: pos.coords.longitude, 
                                 accuracy: pos.coords.accuracy 
                             }),
                             () => alert("Could not fetch location.")
                         );
                     }
                }}
            />
        )}

        {currentView === 'PROFILE' && (
            <UserProfile user={user} onLogout={handleLogout} onUpdateUser={(updates) => setUser(prev => ({ ...prev, ...updates }))} />
        )}
      </main>

      {/* --- CART FLOATING BAR --- */}
      {currentView === 'SHOP' && cart.length > 0 && (
         <CartSheet 
            cart={cart}
            onProceedToPay={handleProceedToPay}
            onUpdateQuantity={updateQuantity}
            onAddProduct={(p) => addToCart(p)}
            mode={orderMode}
            onModeChange={setOrderMode}
            deliveryAddress={deliveryAddress}
            onAddressChange={setDeliveryAddress}
            activeStore={activeStore}
            stores={availableStores}
            userLocation={user.location}
         />
      )}

      {/* --- BOTTOM NAVIGATION --- */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-xl border-t border-slate-100 px-6 py-3 flex justify-between items-center z-50 pb-safe shadow-[0_-10px_40px_-10px_rgba(0,0,0,0.05)]">
          {[
            { 
              id: 'SHOP', 
              label: 'Home', 
              icon: <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" /></svg>,
              activeIcon: <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" viewBox="0 0 20 20" fill="currentColor"><path d="M10.707 2.293a1 1 0 00-1.414 0l-7 7a1 1 0 001.414 1.414L4 10.414V17a1 1 0 001 1h2a1 1 0 001-1v-2a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 001 1h2a1 1 0 001-1v-6.586l.293.293a1 1 0 001.414-1.414l-7-7z" /></svg>
            },
            { 
              id: 'CART', 
              label: 'Cart', 
              badge: totalCartItems,
              icon: <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" /></svg>,
              activeIcon: <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 2a4 4 0 00-4 4v1H5a1 1 0 00-.994.89l-1 9A1 1 0 004 18h12a1 1 0 00.994-1.11l-1-9A1 1 0 0015 7h-1V6a4 4 0 00-4-4zm2 5V6a2 2 0 10-4 0v1h4zm-6 3a1 1 0 112 0 1 1 0 01-2 0zm7-1a1 1 0 100 2 1 1 0 000-2z" clipRule="evenodd" /></svg>
            },
            { 
              id: 'ORDERS', 
              label: 'Orders', 
              icon: <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" /></svg>,
              activeIcon: <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z" clipRule="evenodd" /></svg>
            },
            { 
              id: 'PROFILE', 
              label: 'Profile', 
              icon: <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>,
              activeIcon: <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" /></svg>
            }
          ].map((item) => {
              const isActive = currentView === item.id;
              return (
                <button 
                    key={item.id}
                    onClick={() => setCurrentView(item.id as any)}
                    className={`flex flex-col items-center justify-center w-16 h-12 rounded-2xl transition-all duration-300 group relative ${isActive ? '' : 'hover:bg-slate-50'}`}
                >
                    <span className={`transition-transform duration-300 ${isActive ? 'text-slate-900 -translate-y-1' : 'text-slate-400 group-hover:text-slate-600'}`}>
                        {isActive ? item.activeIcon : item.icon}
                    </span>
                    <span className={`text-[10px] font-bold ${isActive ? 'text-slate-900 opacity-100 translate-y-0.5' : 'text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity translate-y-1'}`}>{item.label}</span>
                    
                    {/* Active Indicator Dot */}
                    {isActive && <span className="absolute bottom-1 w-1 h-1 bg-slate-900 rounded-full animate-pop"></span>}

                    {/* Badge */}
                    {item.badge ? <span className="absolute top-1 right-2 min-w-[16px] h-4 bg-brand-DEFAULT text-white text-[9px] font-black flex items-center justify-center rounded-full border-2 border-white px-0.5 shadow-sm">{item.badge}</span> : null}
                </button>
              );
          })}
      </nav>

      {selectedProduct && (
        <ProductDetailsModal 
            product={selectedProduct} 
            cart={cart}
            activeStoreId={activeStore?.id}
            onClose={() => setSelectedProduct(null)} 
            onAdd={(p, q, brand, price, mrp) => addToCart(p, q, brand, price, mrp)}
            onUpdateQuantity={updateQuantity}
        />
      )}

    </div>
  );
};

export default App;
