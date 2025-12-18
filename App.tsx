
import React, { useState, useEffect, useRef } from 'react';
import { StoreProvider, useStore } from './contexts/StoreContext';
import { Order, DeliveryType, UserState, OrderType } from './types';
import { Auth } from './components/OTPVerification';
import { CartSheet } from './components/CartSheet';
import { PaymentGateway } from './components/PaymentGateway';
import SevenX7Logo from './components/SevenX7Logo';
import { Toast } from './components/Toast';
import { ShopPage } from './pages/Shop';
import { OrdersPage } from './pages/Orders';
import { ProfilePage } from './pages/Profile';

const AppContent: React.FC = () => {
  const { 
    user, setUser, cart, clearCart, 
    activeStore, availableStores, 
    orderMode, setOrderMode,
    addToCart, updateQuantity,
    detectLocation, isLoading,
    toast, hideToast, showToast,
    currentView, setCurrentView,
    addOrder,
    pendingStoreSwitch, resolveStoreSwitch,
    viewingProduct // Global state for product modal
  } = useStore();

  const [deliveryAddress, setDeliveryAddress] = useState('');
  const [showPaymentGateway, setShowPaymentGateway] = useState(false);
  
  // Pending Order State for Checkout
  const [pendingOrderDetails, setPendingOrderDetails] = useState<{ 
    deliveryType: DeliveryType; 
    scheduledTime?: string;
    isPayLater?: boolean;
    existingOrderId?: string; 
    amount?: number;
    splits?: any;
    storeName?: string;
  } | null>(null);

  const watchIdRef = useRef<number | null>(null);

  // Sync address from user profile
  useEffect(() => {
    if (user.address) {
        setDeliveryAddress(user.address);
    }
  }, [user.address]);

  // Handle Store Switch Prompt via Toast
  useEffect(() => {
    if (pendingStoreSwitch) {
        // Check if switching requires clearing cart
        const cartHasItemsFromOtherStore = cart.length > 0 && cart[0].storeId !== pendingStoreSwitch.id;
        
        const message = cartHasItemsFromOtherStore 
            ? `You are closer to ${pendingStoreSwitch.name}. Switch? (Cart will be cleared)`
            : `You are closer to ${pendingStoreSwitch.name}. Switch store?`;

        showToast(
            message,
            {
                label: 'Switch',
                onClick: () => resolveStoreSwitch(true)
            }
        );
    }
  }, [pendingStoreSwitch, cart]);

  // Real-time location watching
  useEffect(() => {
    if (user.isAuthenticated && navigator.geolocation) {
        // Trigger initial detection
        detectLocation();
        
        watchIdRef.current = navigator.geolocation.watchPosition(
            (position) => {
                const { latitude, longitude } = position.coords;
                // Only update if moved significantly to prevent re-renders (> 20 meters)
                setUser(prev => {
                    if (!prev.location) return { ...prev, location: { lat: latitude, lng: longitude } };
                    
                    const latDiff = Math.abs(prev.location.lat - latitude);
                    const lngDiff = Math.abs(prev.location.lng - longitude);
                    
                    if (latDiff > 0.0002 || lngDiff > 0.0002) { // Approx 20m
                        return { ...prev, location: { lat: latitude, lng: longitude } };
                    }
                    return prev;
                });
            },
            (err) => console.warn("Watch position error:", err),
            { enableHighAccuracy: true, maximumAge: 0, timeout: 20000 }
        );
    }
    return () => {
        if (watchIdRef.current !== null) navigator.geolocation.clearWatch(watchIdRef.current);
    };
  }, [user.isAuthenticated]);

  // --- NATIVE NAVIGATION HANDLER ---
  useEffect(() => {
    if (user.isAuthenticated && !window.history.state) {
       window.history.replaceState({ view: 'SHOP' }, '');
    }

    const handlePopState = (event: PopStateEvent) => {
       if (showPaymentGateway) {
           setShowPaymentGateway(false);
           return;
       }

       if (event.state && event.state.view) {
           setCurrentView(event.state.view);
       } else {
           setCurrentView('SHOP');
       }
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [user.isAuthenticated, showPaymentGateway, setCurrentView]);

  const navigateTo = (view: typeof currentView) => {
      if (currentView === view) return;
      window.history.pushState({ view }, '');
      setCurrentView(view);
  };

  const handleLoginSuccess = (userData: UserState) => {
    setUser(userData);
    window.history.replaceState({ view: 'SHOP' }, '');
  };

  const handleDemoLogin = () => {
    setUser({
      isAuthenticated: true,
      id: 'demo-user',
      name: 'Demo User',
      phone: '9999999999',
      location: null,
      address: '',
      savedCards: []
    });
    window.history.replaceState({ view: 'SHOP' }, '');
  };

  const handleProceedToPay = (details: { deliveryType: DeliveryType; scheduledTime?: string; isPayLater?: boolean; splits: any }) => {
      setPendingOrderDetails({
          ...details,
          storeName: activeStore?.name
      });
      if (details.isPayLater) {
          finalizeOrder('Pay Later', { ...details, storeName: activeStore?.name }); 
      } else {
          window.history.pushState({ view: currentView, modal: 'PAYMENT' }, '');
          setShowPaymentGateway(true);
      }
  };

  const handlePayForExistingOrder = (order: Order) => {
     setPendingOrderDetails({
         deliveryType: order.deliveryType,
         scheduledTime: order.scheduledTime,
         existingOrderId: order.id,
         amount: order.total,
         storeName: order.storeName
     });
     window.history.pushState({ view: currentView, modal: 'PAYMENT' }, '');
     setShowPaymentGateway(true);
  };

  const finalizeOrder = async (paymentMethodString: string, directDetails?: typeof pendingOrderDetails) => {
    const details = directDetails || pendingOrderDetails;
    if (!details) return;

    if (details.existingOrderId) {
        if (showPaymentGateway) window.history.back();
        setShowPaymentGateway(false);
        setPendingOrderDetails(null);
        navigateTo('ORDERS');
        return;
    }

    const itemsByStore: Record<string, typeof cart> = {};
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

        const sourceStore = availableStores.find(s => s.id === storeId) || (activeStore?.id === storeId ? activeStore : null);
        const storeLoc = sourceStore ? { lat: sourceStore.lat, lng: sourceStore.lng } : { lat: 0, lng: 0 };

        // Fix: Added missing required 'order_type' property to Order object.
        return {
            id: Date.now().toString() + Math.random().toString(36).substr(2, 5),
            date: new Date().toISOString(),
            items: items,
            total: total,
            status: 'Pending',
            paymentStatus: details.isPayLater ? 'PENDING' : 'PAID',
            paymentMethod: details.isPayLater ? 'Pay Later' : paymentMethodString,
            mode: orderMode,
            deliveryType: details.deliveryType,
            order_type: (sourceStore?.store_type || activeStore?.store_type || 'grocery') as OrderType,
            scheduledTime: details.scheduledTime,
            deliveryAddress: orderMode === 'DELIVERY' ? deliveryAddress : undefined,
            storeName: storeItem.storeName,
            storeLocation: storeLoc, 
            userLocation: user.location || undefined,
            splits: details.splits
        };
    });

    // Use Context addOrder for immediate state update + persistence
    await Promise.all(newOrders.map(order => addOrder(order)));

    clearCart();
    if (showPaymentGateway) window.history.back();
    setShowPaymentGateway(false);
    setPendingOrderDetails(null);
    navigateTo('ORDERS');
  };

  if (!user.isAuthenticated) {
    return <Auth onLoginSuccess={handleLoginSuccess} onDemoLogin={handleDemoLogin} />;
  }

  const totalCartItems = cart.reduce((acc, item) => acc + item.quantity, 0);

  return (
    <div className="min-h-screen bg-[#F8FAFC] font-sans text-slate-900 selection:bg-brand-light selection:text-brand-dark overflow-x-hidden">
      
      <Toast message={toast.message} isVisible={toast.show} onClose={hideToast} action={toast.action} />

      {/* HEADER: Hidden on Profile Page */}
      {currentView !== 'PROFILE' && (
        <header className={`sticky top-0 z-40 bg-white/80 backdrop-blur-xl border-b border-slate-200/50 shadow-sm transition-all duration-300 ${currentView !== 'SHOP' ? 'hidden md:block' : ''}`}>
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
                      <div className="mt-2 text-xs font-bold text-slate-500 animate-pulse bg-slate-100 px-2 py-1 rounded-lg">
                          {isLoading ? 'Locating stores nearby...' : 'No Service Area'}
                      </div>
                  )}
                  
                  <div className="flex items-center gap-1 mt-1 max-w-[200px]" onClick={detectLocation}>
                      <span className="text-brand-DEFAULT text-xs">📍</span>
                      <span className="text-[10px] font-bold text-slate-500 truncate cursor-pointer hover:text-brand-dark transition-colors">
                          {user.address || 'Locating...'}
                      </span>
                  </div>
              </div>

              <button 
                onClick={() => navigateTo('PROFILE')}
                className="w-10 h-10 rounded-full bg-slate-100 border-2 border-white shadow-sm flex items-center justify-center text-lg hover:bg-slate-200 transition-colors active:scale-90 mt-1"
              >
                {user.name ? user.name.charAt(0).toUpperCase() : '👤'}
              </button>
          </div>
        </header>
      )}

      <main className={`max-w-md mx-auto relative min-h-[calc(100vh-50px)] ${currentView === 'PROFILE' ? 'bg-[#F8FAFC]' : ''}`}>
        {currentView === 'SHOP' && (
             <ShopPage />
        )}
        
        {currentView === 'ORDERS' && (
            <OrdersPage onPayNow={handlePayForExistingOrder} />
        )}

        {currentView === 'PROFILE' && (
            <ProfilePage onBack={() => navigateTo('SHOP')} />
        )}

        {currentView === 'CART' && (
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
              isPage={true}
              onClose={() => navigateTo('SHOP')} 
           />
        )}

        {showPaymentGateway && pendingOrderDetails && (
          <PaymentGateway 
             amount={pendingOrderDetails.amount || (pendingOrderDetails.splits ? (pendingOrderDetails.splits.storeAmount + pendingOrderDetails.splits.deliveryFee + pendingOrderDetails.splits.handlingFee) : 0)}
             splits={pendingOrderDetails.splits}
             savedCards={user.savedCards || []}
             onSavePaymentMethod={(method) => {
                 setUser(prev => ({ 
                     ...prev, 
                     savedCards: [...(prev.savedCards || []), method] 
                 }));
             }}
             onSuccess={(method) => finalizeOrder(method)}
             onCancel={() => {
                 window.history.back();
                 setShowPaymentGateway(false);
             }}
             isDemo={user.id === 'demo-user'}
             storeName={pendingOrderDetails.storeName}
          />
        )}

        {currentView === 'SHOP' && (
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
              // Hide button if payment is active OR if product modal is open
              hideButton={showPaymentGateway || !!viewingProduct}
           />
        )}
      </main>

      {/* BOTTOM NAV: Hidden on Profile Page */}
      {currentView !== 'PROFILE' && (
        <nav className="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-lg border-t border-slate-200/60 pb-safe z-50 shadow-[0_-5px_20px_rgba(0,0,0,0.03)]">
           <div className="max-w-md mx-auto flex justify-between items-center px-6 py-0.5">
            {[
              { id: 'SHOP', icon: '🏠', label: 'Home' },
              { id: 'CART', icon: '🛒', label: 'Cart', badge: totalCartItems },
              { id: 'ORDERS', icon: '🧾', label: 'Orders' }
            ].map((item) => {
                const isActive = currentView === item.id;
                return (
                  <button 
                      key={item.id}
                      onClick={() => navigateTo(item.id as any)}
                      className={`flex flex-col items-center justify-center w-16 h-10 transition-all duration-200 active:scale-95 ${isActive ? 'text-slate-900' : 'text-slate-400 hover:text-slate-600'}`}
                  >
                      <div className="relative">
                          <span className={`text-lg mb-0.5 block transition-transform ${isActive ? 'scale-110 -translate-y-0.5' : ''}`}>
                              {item.icon}
                          </span>
                          {item.badge ? (
                              <span className="absolute -top-1 -right-2 min-w-[14px] h-[14px] bg-brand-DEFAULT text-white text-[8px] font-black flex items-center justify-center rounded-full border-2 border-white shadow-sm">
                                  {item.badge}
                              </span>
                          ) : null}
                      </div>
                      <span className={`text-[8px] font-bold ${isActive ? 'text-slate-900' : 'text-slate-400'} opacity-90`}>
                          {item.label}
                      </span>
                      {isActive && <div className="absolute bottom-0 w-1 h-1 bg-brand-DEFAULT rounded-full"></div>}
                  </button>
                );
            })}
           </div>
        </nav>
      )}
      
      {/* Spacer for mobile bottom safe area if needed (only if nav is visible) */}
      {currentView !== 'PROFILE' && (
        <div className="h-2 w-full bg-white fixed bottom-0 z-40 md:hidden"></div> 
      )}
    </div>
  );
};

const App: React.FC = () => {
  return (
    <StoreProvider>
      <AppContent />
    </StoreProvider>
  );
};

export default App;
