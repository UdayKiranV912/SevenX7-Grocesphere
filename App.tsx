
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { INITIAL_PRODUCTS } from './constants';
import { Product, Store, CartItem, OrderMode, UserState, Order, DeliveryType, Variant } from './types';
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
  { 
    id: 'personal', 
    title: 'Care', 
    emoji: '🧼', 
    description: 'Hygiene',
    theme: 'bg-pink-50/50 border-pink-100 text-pink-900',
    iconColor: 'bg-pink-100 text-pink-600',
    filter: (p: Product) => p.category === 'Personal Care'
  },
  { 
    id: 'household', 
    title: 'Home', 
    emoji: '🧺', 
    description: 'Cleaning',
    theme: 'bg-cyan-50/50 border-cyan-100 text-cyan-900',
    iconColor: 'bg-cyan-100 text-cyan-600',
    filter: (p: Product) => p.category === 'Household'
  },
];

const App: React.FC = () => {
  // State
  const [user, setUser] = useState<UserState>({ isAuthenticated: false, phone: '', location: null });
  
  const [products, setProducts] = useState<Product[]>(INITIAL_PRODUCTS);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [orderMode, setOrderMode] = useState<OrderMode>('DELIVERY');
  const [activeStore, setActiveStore] = useState<Store | null>(null);
  const [availableStores, setAvailableStores] = useState<Store[]>([]);
  const [isLoadingStores, setIsLoadingStores] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [searchSuggestions, setSearchSuggestions] = useState<string[]>([]);
  const [selectedFamilyId, setSelectedFamilyId] = useState<string | null>(null);
  const [deliveryAddress, setDeliveryAddress] = useState('');
  const [currentView, setCurrentView] = useState<'SHOP' | 'CART' | 'ORDERS' | 'PROFILE'>('SHOP');
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [showPaymentGateway, setShowPaymentGateway] = useState(false);
  
  const [pendingOrderDetails, setPendingOrderDetails] = useState<{ 
    deliveryType: DeliveryType; 
    scheduledTime?: string;
    isPayLater?: boolean;
    existingOrderId?: string; 
    amount?: number;
    splits?: any; 
  } | null>(null);
  
  const hasFetchedStores = useRef(false);
  const watchIdRef = useRef<number | null>(null);

  const totalCartItems = cart.reduce((acc, item) => acc + item.quantity, 0);

  // Function to trigger location detection with address fetching
  const detectLocation = useCallback(() => {
    // Both Demo Users and Real Users try to get real location first
    if (!navigator.geolocation) {
        console.warn("Geolocation not supported.");
        // Fallback for Demo if no Geo
        if(user.id === 'demo-user') {
             const demoLoc = { lat: 12.9784, lng: 77.6408 }; // Indiranagar
             setUser(prev => ({ ...prev, location: demoLoc, address: 'Indiranagar, Bengaluru (Demo Location)' }));
             setDeliveryAddress('Indiranagar, Bengaluru (Demo Location)');
             initializeStores(demoLoc.lat, demoLoc.lng, true);
        }
        return;
    }

    if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
    }
    
    const isDemo = user.id === 'demo-user';

    // 1. One-time fetch for stores and address
    navigator.geolocation.getCurrentPosition(
        async (position) => {
            const { latitude, longitude } = position.coords;
            
            // Update Coords
            setUser(prev => ({ ...prev, location: { lat: latitude, lng: longitude } }));
            
            // Reverse Geocode for Address
            try {
                const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`);
                const data = await response.json();
                if (data && data.display_name) {
                    const addr = data.display_name;
                    setUser(prev => ({ ...prev, address: addr }));
                    setDeliveryAddress(addr);
                }
            } catch (e) {
                console.error("Address fetch failed", e);
            }

            // Fetch stores around the REAL location
            initializeStores(latitude, longitude, isDemo);
        },
        (error) => {
            console.warn("Location error:", error.message);
            // Fallback logic for DEMO ONLY
            if (isDemo) {
                const demoLoc = { lat: 12.9784, lng: 77.6408 }; // Indiranagar Fallback
                setUser(prev => ({ ...prev, location: demoLoc, address: 'Indiranagar, Bengaluru (Demo Fallback)' }));
                setDeliveryAddress('Indiranagar, Bengaluru (Demo Fallback)');
                initializeStores(demoLoc.lat, demoLoc.lng, true);
                alert("Could not detect location. Using Bengaluru Demo Location.");
            } else {
                alert("Please enable location services to find nearby stores.");
            }
        },
        { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
    );

    // 2. Watch for movement
    watchIdRef.current = navigator.geolocation.watchPosition(
        (position) => {
            const { latitude, longitude } = position.coords;
            setUser(prev => ({ ...prev, location: { lat: latitude, lng: longitude } }));
        },
        (err) => console.warn("Watch position silent error:", err),
        { enableHighAccuracy: true, maximumAge: 0, timeout: 20000 }
    );

  }, [user.id]);

  useEffect(() => {
    return () => {
        if (watchIdRef.current !== null) navigator.geolocation.clearWatch(watchIdRef.current);
    };
  }, []);

  const initializeStores = async (lat: number, lng: number, isDemo: boolean) => {
      // Allow refetch if location changes significantly, but simple debounce here
      if (hasFetchedStores.current && !isDemo) return; 
      
      hasFetchedStores.current = true;
      setIsLoadingStores(true);
      
      try {
          // Fetch stores based on mode
          // Demo: Returns Mock Stores sorted by 'lat/lng' distance
          // Real: Returns Supabase Stores sorted by 'get_nearby_stores' RPC
          const stores = await fetchLiveStores(lat, lng, isDemo);

          if (stores.length > 0) {
              setAvailableStores(stores);
              setActiveStore(stores[0]);
          } else {
              setAvailableStores([]);
              setActiveStore(null);
          }
      } catch (e) {
          console.error(e);
          setAvailableStores([]);
          setActiveStore(null);
      } finally {
          setIsLoadingStores(false);
      }
  };

  // --- REAL TIME INVENTORY SYNC ---
  useEffect(() => {
    if (!activeStore) return;

    const loadInventory = async () => {
        // If it's a real store ID (UUID from Supabase)
        const isRealStore = activeStore.id.length > 20 && !activeStore.id.startsWith('blr-');
        
        if (isRealStore) {
            // Fetch REAL inventory for this store
            const storeSpecificProducts = await fetchStoreProducts(activeStore.id);
            setProducts(storeSpecificProducts); // This will replace global products with ONLY store products
            
            // Subscription for Real-time price/stock updates
            const subscription = subscribeToStoreInventory(activeStore.id, async () => {
                const updated = await fetchStoreProducts(activeStore.id);
                setProducts(updated);
            });

            return () => { subscription.unsubscribe(); };
        } else {
            // Demo Mode: Filter products by 'availableProductIds' to simulate varied store types
            if (activeStore.availableProductIds && activeStore.availableProductIds.length > 0) {
                const filtered = INITIAL_PRODUCTS.filter(p => activeStore.availableProductIds.includes(p.id));
                setProducts(filtered);
            } else {
                setProducts(INITIAL_PRODUCTS);
            }
        }
    };
    loadInventory();
  }, [activeStore]);

  useEffect(() => {
    if (user.isAuthenticated) {
        detectLocation(); // Auto detect for BOTH Demo and Real users now
    }
  }, [user.isAuthenticated, detectLocation]);

  // Search Logic
  useEffect(() => {
    if (searchTerm.length > 0) {
      const term = searchTerm.toLowerCase();
      // Only show suggestions based on what's currently in the product list (which is store specific)
      const prodMatches = products
        .filter(p => p.name.toLowerCase().includes(term) || p.category.toLowerCase().includes(term))
        .map(p => p.name)
        .slice(0, 4);
        
      setSearchSuggestions(prodMatches);
      setShowSuggestions(prodMatches.length > 0);
    } else {
      setShowSuggestions(false);
    }
  }, [searchTerm, products]);

  const handleLoginSuccess = (userData: UserState) => {
    setUser(userData);
    // If user has saved address, use it, else wait for detectLocation
    if (userData.address) {
        setDeliveryAddress(userData.address);
    }
  };

  const handleDemoLogin = () => {
    // Initialize Demo User without location initially
    // The useEffect hook above will trigger 'detectLocation'
    setUser({
      isAuthenticated: true,
      id: 'demo-user',
      name: 'Demo User',
      phone: '9999999999',
      location: null, // Will be filled by Geolocation
      address: '',
      savedCards: [] // Initialize empty
    });
  };

  const handleLogout = () => {
    setUser({ isAuthenticated: false, phone: '', location: null });
    setCart([]);
    setCurrentView('SHOP');
    hasFetchedStores.current = false;
    setActiveStore(null);
    setAvailableStores([]);
  };

  const addToCart = (product: Product, quantity = 1, brand?: string, brandPrice?: number, variant?: Variant) => {
    if (!activeStore) {
        alert("Please wait for stores to load or check your location.");
        return;
    }
    const selectedBrand = brand || 'Generic';
    // If variant exists, multiply brand price by variant multiplier
    const basePrice = brandPrice || product.price;
    const finalPrice = variant ? Math.round(basePrice * variant.multiplier) : basePrice;
    
    // Create unique ID combining Product + Brand + Variant + Store
    const variantKey = variant ? `-${variant.name}` : '';
    const cartId = `${product.id}-${selectedBrand}${variantKey}-${activeStore.id}`;

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
          selectedVariant: variant,
          price: finalPrice,
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

        // Find the actual store object to get coordinates
        const sourceStore = availableStores.find(s => s.id === storeId) || (activeStore?.id === storeId ? activeStore : null);
        const storeLoc = sourceStore ? { lat: sourceStore.lat, lng: sourceStore.lng } : { lat: 0, lng: 0 };

        return {
            id: Date.now().toString() + Math.random().toString(36).substr(2, 5),
            date: new Date().toISOString(),
            items: items,
            total: total,
            status: 'Pending',
            paymentStatus: details.isPayLater ? 'PENDING' : 'PAID',
            mode: orderMode,
            deliveryType: details.deliveryType,
            scheduledTime: details.scheduledTime,
            deliveryAddress: orderMode === 'DELIVERY' ? deliveryAddress : undefined,
            storeName: storeItem.storeName,
            storeLocation: storeLoc, 
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

  const openSupport = () => {
     const text = "Hi Grocesphere Support, I need help.";
     const whatsapp = `https://wa.me/919483496940?text=${encodeURIComponent(text)}`;
     window.open(whatsapp, '_blank');
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
             savedCards={user.savedCards || []}
             onSavePaymentMethod={(method) => {
                 setUser(prev => ({ 
                     ...prev, 
                     savedCards: [...(prev.savedCards || []), method] 
                 }));
             }}
             onSuccess={() => finalizeOrder(undefined)}
             onCancel={() => setShowPaymentGateway(false)}
             isDemo={user.id === 'demo-user'}
          />
      );
  }

  // Filter products based on Active Store type/inventory and User Search
  const displayedProducts = products; // 'products' state is already store-scoped in useEffect

  const filteredProducts = displayedProducts.filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          p.category.toLowerCase().includes(searchTerm.toLowerCase());
    
    // Also filter by selected Family if any
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

                {activeStore ? (
                    <div className="flex items-center gap-2 bg-slate-100 rounded-full pl-1 pr-3 py-1 mt-2 cursor-default select-none animate-fade-in">
                        <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs text-white shadow-sm transition-colors ${
                            activeStore?.type === 'produce' ? 'bg-emerald-500' : 
                            activeStore?.type === 'dairy' ? 'bg-blue-500' : 'bg-orange-500'
                        }`}>
                            {activeStore?.type === 'produce' ? '🥦' : activeStore?.type === 'dairy' ? '🥛' : '🏪'}
                        </div>
                        <div className="flex flex-col items-start">
                            <span className="text-[9px] font-bold text-slate-400 uppercase leading-none mb-0.5">Shopping At</span>
                            <span className="text-xs font-bold text-slate-800 leading-none truncate max-w-[120px]">
                                {activeStore.name}
                            </span>
                        </div>
                    </div>
                ) : (
                    <div className="mt-2 text-xs font-bold text-red-400 animate-pulse">
                        {isLoadingStores ? 'Locating stores nearby...' : 'No stores found nearby.'}
                    </div>
                )}
                
                {/* ADDRESS DISPLAY */}
                <div className="flex items-center gap-1 mt-1 max-w-[200px]" onClick={detectLocation}>
                    <span className="text-brand-DEFAULT text-xs">📍</span>
                    <span className="text-[10px] font-bold text-slate-500 truncate cursor-pointer hover:text-brand-dark transition-colors">
                        {user.address || 'Locating...'}
                    </span>
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
        <button 
            onClick={openSupport}
            className="fixed bottom-24 right-4 z-[60] w-12 h-12 bg-white rounded-full shadow-lg border border-slate-100 flex items-center justify-center text-2xl hover:scale-110 transition-transform active:scale-95"
            title="Contact Support"
        >
            🎧
        </button>

        {currentView === 'SHOP' && (
          <div className="px-4 space-y-6 animate-fade-in">
            {/* Search Bar */}
            <div className="relative group z-30">
              <input 
                type="text" 
                placeholder={activeStore ? "Search items..." : "Finding stores..."}
                disabled={!activeStore}
                className="w-full pl-12 pr-4 py-4 bg-white rounded-2xl shadow-soft text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-DEFAULT/50 transition-all font-bold text-sm disabled:opacity-50"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
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
            {activeStore && !searchTerm && (
                <div className="grid grid-cols-4 gap-2">
                {PRODUCT_FAMILIES.map((family) => {
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
              <div className="flex items-center justify-between mb-4">
                 <h2 className="text-xl font-black text-slate-800">{searchTerm ? 'Search Results' : 'Fresh Picks'}</h2>
                 <span className="text-xs font-bold text-slate-400 bg-slate-100 px-2 py-1 rounded-lg">{filteredProducts.length} items</span>
              </div>
              
              {activeStore ? (
                  <div className="grid grid-cols-2 gap-3">
                        {filteredProducts.map((product) => (
                        <StickerProduct 
                            key={product.id} 
                            product={product} 
                            onAdd={(p) => addToCart(p)}
                            onUpdateQuantity={(id, delta) => {
                                // Simple update for items without specific variants or just base product
                                const item = cart.find(c => c.originalProductId === product.id && c.storeId === activeStore?.id);
                                if (item) updateQuantity(item.id, delta);
                            }}
                            onClick={(p) => setSelectedProduct(p)}
                            count={cart.filter(item => item.originalProductId === product.id && item.storeId === activeStore?.id).reduce((acc, curr) => acc + curr.quantity, 0)}
                        />
                        ))}
                  </div>
              ) : (
                  <div className="flex flex-col items-center justify-center py-12 text-center opacity-50">
                      <div className="text-4xl mb-2">🏪</div>
                      <p className="font-bold text-slate-400">Select a store to see items</p>
                  </div>
              )}
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
                userId={user.id}
                onPayNow={(order) => handlePayForExistingOrder(order)}
            />
        )}

        {currentView === 'PROFILE' && (
            <UserProfile 
                user={user} 
                onUpdateUser={(updates) => setUser(prev => ({ ...prev, ...updates }))}
                onLogout={handleLogout}
            />
        )}

        {/* Product Details Modal */}
        {selectedProduct && (
            <ProductDetailsModal 
                product={selectedProduct}
                onClose={() => setSelectedProduct(null)}
                onAdd={(p, q, b, pr) => addToCart(p, q, b, pr)}
            />
        )}

        {/* Cart Sheet (always visible if cart has items) */}
        <CartSheet 
            cart={cart}
            onProceedToPay={handleProceedToPay}
            onUpdateQuantity={(id, d) => updateQuantity(id, d)}
            onAddProduct={(p) => addToCart(p)}
            mode={orderMode}
            onModeChange={setOrderMode}
            deliveryAddress={deliveryAddress}
            onAddressChange={setDeliveryAddress}
            activeStore={activeStore}
            stores={availableStores}
            userLocation={user.location}
        />

      </main>

      <nav className="fixed bottom-6 left-6 right-6 max-w-sm mx-auto bg-white/90 backdrop-blur-xl border-2 border-slate-100 shadow-float rounded-full px-2 py-2 flex justify-between items-center z-[60]">
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
    </div>
  );
};

export default App;
