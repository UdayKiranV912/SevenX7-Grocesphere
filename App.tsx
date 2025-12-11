
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

// Define Product Families with updated styling
const PRODUCT_FAMILIES = [
  { 
    id: 'grains', 
    title: 'Grains', 
    emoji: '🌾', 
    description: 'Rice & Flour',
    theme: 'bg-orange-50/50 border-orange-100 text-orange-900',
    iconColor: 'bg-orange-100 text-orange-600',
    filter: (p: Product) => p.category === 'Staples' && parseInt(p.id) <= 10
  },
  { 
    id: 'pulses', 
    title: 'Pulses', 
    emoji: '🫘', 
    description: 'Lentils & Beans',
    theme: 'bg-amber-50/50 border-amber-100 text-amber-900',
    iconColor: 'bg-amber-100 text-amber-600',
    filter: (p: Product) => p.category === 'Staples' && parseInt(p.id) > 10
  },
  { 
    id: 'oils', 
    title: 'Oils', 
    emoji: '🏺', 
    description: 'Cooking Essentials',
    theme: 'bg-yellow-50/50 border-yellow-100 text-yellow-900',
    iconColor: 'bg-yellow-100 text-yellow-600',
    filter: (p: Product) => p.category === 'Oils & Spices'
  },
  { 
    id: 'dairy', 
    title: 'Dairy', 
    emoji: '🥛', 
    description: 'Milk & Bread',
    theme: 'bg-blue-50/50 border-blue-100 text-blue-900',
    iconColor: 'bg-blue-100 text-blue-600',
    filter: (p: Product) => p.category === 'Dairy & Breakfast'
  },
  { 
    id: 'produce', 
    title: 'Fresh', 
    emoji: '🥦', 
    description: 'Fruits & Veg',
    theme: 'bg-emerald-50/50 border-emerald-100 text-emerald-900',
    iconColor: 'bg-emerald-100 text-emerald-600',
    filter: (p: Product) => p.category === 'Veg & Fruits'
  },
  { 
    id: 'snacks', 
    title: 'Snacks', 
    emoji: '🍿', 
    description: 'Chips & Drinks',
    theme: 'bg-purple-50/50 border-purple-100 text-purple-900',
    iconColor: 'bg-purple-100 text-purple-600',
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
  const watchIdRef = useRef<number | null>(null);

  const totalCartItems = cart.reduce((acc, item) => acc + item.quantity, 0);

  // Function to trigger location detection - IMPROVED
  const detectLocation = useCallback(() => {
    if (!navigator.geolocation) {
        console.warn("Geolocation not supported by browser.");
        return;
    }

    if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
    }
    
    // Pass user ID to determine if we should load mock stores
    const isDemoUser = user.id === 'demo-user';

    navigator.geolocation.getCurrentPosition(
        (position) => {
            const { latitude, longitude } = position.coords;
            setUser(prev => ({ ...prev, location: { lat: latitude, lng: longitude } }));
            
            if (!hasFetchedStores.current) {
                initializeStores(latitude, longitude, isDemoUser);
            }
        },
        (error) => console.warn("Location error:", error.message),
        { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
    );

    watchIdRef.current = navigator.geolocation.watchPosition(
        (position) => {
            const { latitude, longitude } = position.coords;
            setUser(prev => ({ ...prev, location: { lat: latitude, lng: longitude } }));
            
            if (!hasFetchedStores.current) {
                initializeStores(latitude, longitude, isDemoUser);
            }
        },
        (err) => console.warn("Watch position silent error:", err),
        { enableHighAccuracy: true, maximumAge: 0, timeout: 20000 }
    );

  }, [user.id]); // Depend on user.id to switch modes

  useEffect(() => {
    return () => {
        if (watchIdRef.current !== null) navigator.geolocation.clearWatch(watchIdRef.current);
    };
  }, []);

  // Fetch both Registered DB Stores and fallback OSM stores
  const initializeStores = async (lat: number, lng: number, isDemo: boolean) => {
      hasFetchedStores.current = true;
      setIsLoadingStores(true);
      
      try {
          // 1. Fetch Real Registered Stores from Supabase (My Store Admin)
          const dbStores = await fetchLiveStores(lat, lng);

          // 2. Fetch OSM stores
          const osmStores = await findNearbyStores(lat, lng);

          // Combine: Prioritize DB stores
          const allStores = [...dbStores];
          
          osmStores.forEach(osm => {
             const exists = allStores.some(db => {
                 const dist = Math.sqrt(Math.pow(db.lat - osm.lat, 2) + Math.pow(db.lng - osm.lng, 2));
                 return dist < 0.0005; 
             });
             if (!exists) allStores.push(osm);
          });

          if (isDemo) {
             // DEMO MODE: Ensure stores are always populated using MOCK data if sparse
             if (allStores.length < 5) {
                setAvailableStores([...allStores, ...MOCK_STORES]);
                setActiveStore(allStores[0] || MOCK_STORES[0]);
             } else {
                setAvailableStores(allStores);
                setActiveStore(allStores[0]);
             }
          } else {
             // REAL USER: Only show DB + OSM Stores
             // This fulfills: "add in the map the store/local marts from the my store admin"
             // and ensures Real Users see real data.
             if (allStores.length === 0) {
                 // Warn or fallback to OSM if desperate, but do NOT show Bangalore Mock stores if user is elsewhere
                 // unless we are absolutely sure. For now, empty list is safer than misleading mock data.
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

  useEffect(() => {
    if (user.isAuthenticated) {
        detectLocation();
    }
  }, [user.isAuthenticated, detectLocation]);

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
        .filter(f => f.title.toLowerCase().includes(term) || f.description.toLowerCase().includes(term))
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
        // ... (existing update logic) ...
        setShowPaymentGateway(false);
        setPendingOrderDetails(null);
        setCurrentView('ORDERS');
        return;
    }

    // Creating new orders
    const deadline = details.scheduledTime 
        ? new Date(new Date(details.scheduledTime).getTime() - 30 * 60000).toISOString()
        : undefined;

    // We only support SINGLE store payment flow for the split logic in this MVP
    // If cart has multiple stores, splits apply to each individually or aggregated.
    // For simplicity, we assume one active store flow or basic split.
    
    // Create one order per store
    const itemsByStore: Record<string, CartItem[]> = {};
    cart.forEach(item => {
        if (!itemsByStore[item.storeId]) itemsByStore[item.storeId] = [];
        itemsByStore[item.storeId].push(item);
    });

    const newOrders: Order[] = Object.entries(itemsByStore).map(([storeId, items]) => {
        const storeItem = items[0];
        const subTotal = items.reduce((acc, item) => acc + (item.price * item.quantity), 0);
        // Recalculate fees locally just to be safe for the Object
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
            storeLocation: { lat: 0, lng: 0 }, // Should fetch real location
            userLocation: user.location || undefined,
            splits: details.splits // Save split info
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

  // Payment Gateway Render
  if (showPaymentGateway && pendingOrderDetails) {
      // Calculate total if not set
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
    <div className="min-h-screen bg-[#F8FAFC] pb-24 font-sans text-slate-900 selection:bg-brand-light selection:text-brand-dark">
      
      {/* HEADER */}
      <header className="sticky top-0 z-40 bg-white/80 backdrop-blur-xl border-b border-slate-200/50 shadow-sm transition-all duration-300">
        <div className="max-w-md mx-auto px-4 py-3 flex items-start justify-between">
            <div className="flex flex-col items-start gap-1">
                <div className="flex flex-col items-start">
                   <h1 className="text-2xl font-black text-slate-900 tracking-tight leading-none">Grocesphere</h1>
                   <div className="mt-1 flex justify-start">
                     <SevenX7Logo size="xs" />
                   </div>
                </div>

                <div className="flex items-center gap-2 bg-slate-100 rounded-full pl-1 pr-3 py-1 mt-2 cursor-default select-none">
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs text-white shadow-sm transition-colors ${
                        activeStore?.type === 'produce' ? 'bg-emerald-500' : 
                        activeStore?.type === 'dairy' ? 'bg-blue-500' : 'bg-orange-500'
                    }`}>
                        {activeStore?.type === 'produce' ? '🥦' : activeStore?.type === 'dairy' ? '🥛' : '🏪'}
                    </div>
                    <div className="flex flex-col items-start">
                        <span className="text-[9px] font-bold text-slate-400 uppercase leading-none mb-0.5">Shopping At</span>
                        <span className="text-xs font-bold text-slate-800 leading-none truncate max-w-[120px]">
                            {isLoadingStores ? 'Locating...' : (activeStore?.name || 'Select Store')}
                        </span>
                    </div>
                </div>
            </div>

            <button 
              onClick={() => setCurrentView('PROFILE')}
              className="w-10 h-10 rounded-full bg-slate-100 border-2 border-white shadow-sm flex items-center justify-center text-lg hover:bg-slate-200 transition-colors active:scale-90 mt-1"
            >
              {user.name ? user.name.charAt(0).toUpperCase() : '👤'}
            </button>
        </div>
      </header>

      <main className="max-w-md mx-auto pt-4 relative">
        {currentView === 'SHOP' && (
          <div className="px-4 space-y-6 animate-fade-in">
            {/* Search Bar */}
            <div className="relative group z-30">
              <input 
                type="text" 
                placeholder="Search fresh items..." 
                className="w-full pl-12 pr-4 py-4 bg-white rounded-2xl shadow-soft text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-DEFAULT/50 transition-all font-bold text-sm"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onFocus={() => searchTerm.length > 0 && setShowSuggestions(true)}
              />
              {/* ...suggestions... */}
            </div>

            {/* Map & Toggle */}
            <div className="space-y-4">
                <div className="bg-white p-1.5 rounded-2xl shadow-sm border border-slate-100 flex relative z-0">
                    <button onClick={() => setOrderMode('DELIVERY')} className={`flex-1 py-3 rounded-xl text-xs font-black uppercase tracking-wide transition-all ${orderMode === 'DELIVERY' ? 'bg-slate-900 text-white' : 'text-slate-400'}`}>Delivery</button>
                    <button onClick={() => setOrderMode('PICKUP')} className={`flex-1 py-3 rounded-xl text-xs font-black uppercase tracking-wide transition-all ${orderMode === 'PICKUP' ? 'bg-slate-900 text-white' : 'text-slate-400'}`}>Pickup</button>
                </div>
                <div className="h-48 rounded-[2rem] overflow-hidden shadow-card border border-white relative z-0">
                     <MapVisualizer 
                        stores={availableStores} 
                        userLat={user.location?.lat || 0}
                        userLng={user.location?.lng || 0}
                        selectedStore={activeStore}
                        onSelectStore={setActiveStore}
                        mode={orderMode}
                        showRoute={orderMode === 'DELIVERY'}
                        className="h-full"
                        onRequestLocation={detectLocation}
                    />
                </div>
            </div>

            {/* Families & Products */}
            {!searchTerm && (
                <div className="grid grid-cols-3 gap-2">
                {PRODUCT_FAMILIES.map((family) => {
                    const isSelected = selectedFamilyId === family.id;
                    return (
                    <button
                        key={family.id}
                        onClick={() => setSelectedFamilyId(isSelected ? null : family.id)}
                        className={`relative p-3 rounded-2xl border transition-all duration-300 flex flex-col items-center gap-2 ${isSelected ? 'bg-slate-800 border-slate-900 shadow-lg scale-[1.02]' : `${family.theme} hover:scale-[1.02] bg-white`}`}
                    >
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center text-xl shadow-sm ${isSelected ? 'bg-white/10 text-white' : 'bg-white'}`}>{family.emoji}</div>
                        <span className={`text-[10px] font-black uppercase tracking-wide ${isSelected ? 'text-white' : ''}`}>{family.title}</span>
                    </button>
                    );
                })}
                </div>
            )}

            <div className="pb-10">
              <div className="flex items-center justify-between mb-4">
                 <h2 className="text-xl font-black text-slate-800">{searchTerm ? 'Search Results' : 'Fresh Picks'}</h2>
                 <span className="text-xs font-bold text-slate-400 bg-slate-100 px-2 py-1 rounded-lg">{filteredProducts.length} items</span>
              </div>
              <div className="grid grid-cols-2 gap-3">
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
            <MyOrders userLocation={user.location} onPayNow={handlePayForExistingOrder} userId={user.id} />
        )}

        {currentView === 'PROFILE' && (
            <UserProfile user={user} onLogout={handleLogout} onUpdateUser={(updates) => setUser(prev => ({ ...prev, ...updates }))} />
        )}
      </main>

      {/* Navigation */}
      <nav className="fixed bottom-6 left-6 right-6 max-w-sm mx-auto bg-white/90 backdrop-blur-xl border border-white/20 shadow-float rounded-full px-2 py-2 flex justify-between items-center z-50">
          {[
            { id: 'SHOP', icon: '🏠', label: 'Home' },
            { id: 'CART', icon: '🛒', label: 'Cart', badge: totalCartItems },
            { id: 'ORDERS', icon: '🧾', label: 'Orders' },
            { id: 'PROFILE', icon: '👤', label: 'Profile' }
          ].map((item) => {
              const isActive = currentView === item.id;
              return (
                <button 
                    key={item.id}
                    onClick={() => setCurrentView(item.id as any)}
                    className={`relative flex-1 h-12 flex items-center justify-center rounded-full transition-all duration-300 ${isActive ? 'bg-slate-900 text-white shadow-lg' : 'text-slate-400 hover:bg-slate-50'}`}
                >
                    <span className={`text-xl ${isActive ? 'scale-110' : ''}`}>{item.icon}</span>
                    {item.badge ? <span className="absolute top-1 right-3 w-4 h-4 bg-brand-DEFAULT text-white text-[9px] font-black flex items-center justify-center rounded-full border-2 border-white">{item.badge}</span> : null}
                </button>
              );
          })}
      </nav>

      {selectedProduct && <ProductDetailsModal product={selectedProduct} onClose={() => setSelectedProduct(null)} onAdd={(p, q, brand, price, mrp) => addToCart(p, q, brand, price, mrp)} />}

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

    </div>
  );
};

export default App;
