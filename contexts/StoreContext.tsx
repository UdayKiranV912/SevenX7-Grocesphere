
import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { UserState, CartItem, Store, Product, OrderMode, Variant, Order } from '../types';
import { INITIAL_PRODUCTS, MOCK_STORES } from '../constants';
import { getStoreProducts } from '../services/products';
import { fetchLiveStores } from '../services/storeService';
import { reverseGeocode } from '../services/maps';
import { getUserOrders, subscribeToUserOrders, saveOrder } from '../services/orderService';

type ViewState = 'SHOP' | 'CART' | 'ORDERS' | 'PROFILE';

interface StoreContextType {
  user: UserState;
  setUser: React.Dispatch<React.SetStateAction<UserState>>;
  cart: CartItem[];
  addToCart: (product: Product, quantity?: number, brand?: string, price?: number, variant?: Variant) => void;
  updateQuantity: (cartId: string, delta: number) => void;
  clearCart: () => void;
  activeStore: Store | null;
  setActiveStore: (store: Store | null) => void;
  availableStores: Store[];
  products: Product[];
  orderMode: OrderMode;
  setOrderMode: (mode: OrderMode) => void;
  detectLocation: () => void;
  isLoading: boolean;
  isProductLoading: boolean;
  
  // Orders & Tracking
  orders: Order[];
  addOrder: (order: Order) => Promise<void>;
  activeOrder: Order | null;
  driverLocations: Record<string, { lat: number; lng: number }>;
  currentView: ViewState;
  setCurrentView: (view: ViewState) => void;

  // Global UI State
  viewingProduct: Product | null;
  setViewingProduct: (product: Product | null) => void;

  // Toast
  toast: { show: boolean; message: string; action?: { label: string, onClick: () => void } };
  showToast: (message: string, action?: { label: string, onClick: () => void }) => void;
  hideToast: () => void;

  // Store Switch Prompt
  pendingStoreSwitch: Store | null;
  resolveStoreSwitch: (accepted: boolean) => void;

  // Favorites
  favorites: string[];
  toggleFavorite: (productId: string) => void;
  isFavorite: (productId: string) => boolean;
}

const StoreContext = createContext<StoreContextType | undefined>(undefined);

// Helper for distance
function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371;
  const dLat = (lat2 - lat1) * (Math.PI/180);
  const dLon = (lon2 - lon1) * (Math.PI/180);
  const a =
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * (Math.PI/180)) * Math.cos(lat2 * (Math.PI/180)) *
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}

export const StoreProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserState>({ isAuthenticated: false, phone: '', location: null });
  // Initialize cart from localStorage
  const [cart, setCart] = useState<CartItem[]>(() => {
    try {
        const saved = localStorage.getItem('grocesphere_cart');
        return saved ? JSON.parse(saved) : [];
    } catch (e) { return []; }
  });
  
  const [activeStore, setActiveStore] = useState<Store | null>(null);
  const [availableStores, setAvailableStores] = useState<Store[]>([]);
  const [products, setProducts] = useState<Product[]>(INITIAL_PRODUCTS);
  const [orderMode, setOrderMode] = useState<OrderMode>('DELIVERY');
  const [isLoading, setIsLoading] = useState(false);
  const [isProductLoading, setIsProductLoading] = useState(false);
  
  // Navigation State
  const [currentView, setCurrentView] = useState<ViewState>('SHOP');
  const [viewingProduct, setViewingProduct] = useState<Product | null>(null);

  // Orders State
  const [orders, setOrders] = useState<Order[]>([]);
  const [driverLocations, setDriverLocations] = useState<Record<string, {lat: number, lng: number}>>({});

  // Toast State
  const [toast, setToast] = useState<{ show: boolean; message: string; action?: { label: string, onClick: () => void } }>({ show: false, message: '' });

  // Store Switch Prompt State
  const [pendingStoreSwitch, setPendingStoreSwitch] = useState<Store | null>(null);

  // Favorites State
  const [favorites, setFavorites] = useState<string[]>(() => {
      try {
          const saved = localStorage.getItem('grocesphere_favorites');
          return saved ? JSON.parse(saved) : [];
      } catch (e) { return []; }
  });

  // Internal state to track stores user has declined to switch to
  const [ignoredStores, setIgnoredStores] = useState<string[]>([]);
  
  // Ref to prevent spamming alerts (Cooldown mechanism)
  const lastAlertTimeRef = useRef<number>(0);

  // Derived Active Order (The most recent one that isn't completed/cancelled)
  const activeOrder = orders.find(o => 
      o.status !== 'Delivered' && o.status !== 'Picked Up' && o.status !== 'Cancelled'
  ) || null;

  // Persist Favorites
  useEffect(() => {
      localStorage.setItem('grocesphere_favorites', JSON.stringify(favorites));
  }, [favorites]);

  // Cart Persistence
  useEffect(() => {
      localStorage.setItem('grocesphere_cart', JSON.stringify(cart));
  }, [cart]);

  // --- ORDER MANAGEMENT & SIMULATION ---
  const addOrder = async (newOrder: Order) => {
      setOrders(prev => [newOrder, ...prev]);
      if (user.id === 'demo-user') {
          const existingData = localStorage.getItem('grocesphere_orders');
          const existingOrders = existingData ? JSON.parse(existingData) : [];
          localStorage.setItem('grocesphere_orders', JSON.stringify([newOrder, ...existingOrders]));
      } else if (user.id) {
          try {
              await saveOrder(user.id, newOrder);
          } catch (e) {
              console.error("Failed to save order to DB", e);
              showToast("Error saving order. Please check connection.");
          }
      }
  };

  useEffect(() => {
    if (!user.isAuthenticated) return;
    const fetchOrders = async () => {
      try {
        if (user.id === 'demo-user') {
          const savedOrders = localStorage.getItem('grocesphere_orders');
          if (savedOrders) {
             const parsed: Order[] = JSON.parse(savedOrders);
             const unique = parsed.filter((v,i,a)=>a.findIndex(t=>(t.id === v.id))===i);
             setOrders(unique);
          }
        } else if (user.id) {
          const dbOrders = await getUserOrders(user.id);
          const unique = dbOrders.filter((v,i,a)=>a.findIndex(t=>(t.id === v.id))===i);
          setOrders(unique);
        }
      } catch (error) { console.error(error); }
    };
    fetchOrders();

    let subscription: any = null;
    if (user.id && user.id !== 'demo-user') {
        subscription = subscribeToUserOrders(user.id, (updatedOrderDb) => {
            setOrders(prev => prev.map(o => {
                if (o.id === updatedOrderDb.id) {
                    let appStatus: Order['status'] = 'Pending';
                    if (updatedOrderDb.status === 'packing') appStatus = 'Preparing';
                    if (updatedOrderDb.status === 'ready') appStatus = 'Ready';
                    if (updatedOrderDb.status === 'on_way') appStatus = 'On the way';
                    if (updatedOrderDb.status === 'delivered') appStatus = 'Delivered';
                    if (updatedOrderDb.status === 'picked_up') appStatus = 'Picked Up';
                    if (updatedOrderDb.status === 'cancelled') appStatus = 'Cancelled';
                    return { ...o, status: appStatus };
                }
                return o;
            }));
        });
    }
    return () => { if (subscription) subscription.unsubscribe(); };
  }, [user.id, user.isAuthenticated]);

  useEffect(() => {
    if (!user.isAuthenticated || orders.length === 0) return;
    const statusInterval = setInterval(() => {
      setOrders(prev => {
        let hasChanges = false;
        const updated = prev.map((o): Order => {
            const orderTime = new Date(o.date).getTime();
            if (Date.now() - orderTime > 30 * 60 * 1000) return o;
            if (o.status === 'Cancelled' || o.status === 'Delivered' || o.status === 'Picked Up') return o;
            let nextStatus: Order['status'] = o.status;
            if (o.status === 'Pending') nextStatus = 'Preparing';
            else if (o.status === 'Preparing') nextStatus = o.mode === 'DELIVERY' ? 'On the way' : 'Ready';
            else if (o.status === 'On the way' && Math.random() > 0.7) nextStatus = 'Delivered';
            else if (o.status === 'Ready' && Math.random() > 0.8) nextStatus = 'Picked Up';
            if (nextStatus !== o.status) {
                hasChanges = true;
                return { ...o, status: nextStatus };
            }
            return o;
        });
        if (hasChanges && user.id === 'demo-user') {
            localStorage.setItem('grocesphere_orders', JSON.stringify(updated));
        }
        return hasChanges ? updated : prev;
      });
    }, 10000);

    const driverInterval = setInterval(() => {
        setDriverLocations(prev => {
            const nextLocs = { ...prev };
            let updated = false;
            orders.forEach(order => {
                if (order.status === 'On the way' && order.storeLocation && user.location) {
                    if (!nextLocs[order.id]) {
                        nextLocs[order.id] = { ...order.storeLocation };
                    }
                    const driver = nextLocs[order.id];
                    const speed = 0.00015;
                    const dLat = user.location.lat - driver.lat;
                    const dLng = user.location.lng - driver.lng;
                    const distance = Math.sqrt(dLat*dLat + dLng*dLng);
                    if (distance > 0.0002) {
                        nextLocs[order.id] = {
                            lat: driver.lat + (dLat / distance) * speed,
                            lng: driver.lng + (dLng / distance) * speed
                        };
                        updated = true;
                    }
                }
            });
            return updated ? nextLocs : prev;
        });
    }, 1000);
    return () => {
        clearInterval(statusInterval);
        clearInterval(driverInterval);
    };
  }, [orders.length, user.location, user.id, user.isAuthenticated]);

  // Smart Store Proximity Check (Non-blocking)
  useEffect(() => {
      // Don't check if we already have a pending prompt
      if (pendingStoreSwitch) return;

      const now = Date.now();
      // Reduced cooldown to 60s for better responsiveness to driving
      if (now - lastAlertTimeRef.current < 60000) return;

      if (user.location && activeStore && availableStores.length > 0) {
          const distToActive = calculateDistance(user.location.lat, user.location.lng, activeStore.lat, activeStore.lng);
          
          // Find the absolute closest store
          const closest = availableStores.reduce((prev, curr) => {
              const distPrev = calculateDistance(user.location!.lat, user.location!.lng, prev.lat, prev.lng);
              const distCurr = calculateDistance(user.location!.lat, user.location!.lng, curr.lat, curr.lng);
              return distCurr < distPrev ? curr : prev;
          });

          const distToClosest = calculateDistance(user.location.lat, user.location.lng, closest.lat, closest.lng);
          const isSameAsActive = closest.id === activeStore.id;
          const isIgnored = ignoredStores.includes(closest.id);

          if (!isSameAsActive && !isIgnored) {
              // Condition 1: User is extremely close to a different store (< 0.5km)
              // This suggests they physically arrived at a new location.
              if (distToClosest < 0.5) {
                  lastAlertTimeRef.current = Date.now();
                  setPendingStoreSwitch(closest);
                  return;
              }

              // Condition 2: Current store is far (> 2km) and there is a significantly closer store
              // We want to avoid switching if the difference is negligible.
              // Logic: If closest is less than 70% of distance to active, it's worth switching.
              if (distToActive > 2.0 && distToClosest < (distToActive * 0.7)) {
                  lastAlertTimeRef.current = Date.now();
                  setPendingStoreSwitch(closest);
              }
          }
      }
  }, [user.location, activeStore, availableStores, ignoredStores, pendingStoreSwitch]);

  const resolveStoreSwitch = (accepted: boolean) => {
      if (accepted && pendingStoreSwitch) {
          if (cart.length > 0 && cart[0].storeId !== pendingStoreSwitch.id) {
              setCart([]); 
          }
          setActiveStore(pendingStoreSwitch);
          setIgnoredStores([]); 
          showToast(`Switched to ${pendingStoreSwitch.name}`);
      } else if (!accepted && pendingStoreSwitch) {
          setIgnoredStores(prev => [...prev, pendingStoreSwitch.id]);
      }
      setPendingStoreSwitch(null);
  };

  // 1. Location & Store Discovery
  const detectLocation = useCallback(() => {
    if (!navigator.geolocation) {
        alert("Geolocation is not supported by this browser.");
        setIsLoading(false);
        return;
    }

    setIsLoading(true);

    const handleSuccess = async (pos: GeolocationPosition) => {
        const { latitude, longitude } = pos.coords;
        
        setUser(prev => ({ ...prev, location: { lat: latitude, lng: longitude } }));
        
        try {
            const addressData = await reverseGeocode(latitude, longitude);
            if (addressData?.display_name) {
                setUser(prev => ({ ...prev, address: addressData.display_name.split(',')[0] }));
            }
        } catch (e) {
            // keep previous or default
        }

        try {
          const isDemo = user.id === 'demo-user';
          // Fetch stores based on LIVE location for both Demo and Real users.
          // In Demo mode, it generates mock stores around the real location.
          // In Real mode, it ONLY queries the database.
          const stores = await fetchLiveStores(latitude, longitude, isDemo);
          
          if (stores.length > 0) {
              setAvailableStores(stores);
              
              setActiveStore(prev => {
                 if (prev && stores.find(s => s.id === prev.id)) return prev;
                 
                 if (cart.length > 0) {
                     const cartStoreId = cart[0].storeId;
                     const found = stores.find(s => s.id === cartStoreId);
                     if (found) return found;
                 }
                 return stores[0]; // Default to closest
              });
          } else {
              // NO STORES FOUND
              setAvailableStores([]);
              setActiveStore(null);
          }
          
        } catch (e) {
          console.error(e);
          setAvailableStores([]);
          setActiveStore(null);
        } finally {
          setIsLoading(false);
        }
    };

    const handleError = (err: GeolocationPositionError) => {
        console.warn("Location error:", err);
        // On error, we still need a fallback for the app to function minimally,
        // but we flag it via UI instead of faking it for Real users.
        if (user.id === 'demo-user') {
            // Only for demo user fallback if sensor fails entirely
            const fallbackLat = 12.9716;
            const fallbackLng = 77.5946;
            setUser(prev => ({ 
                ...prev, 
                location: { lat: fallbackLat, lng: fallbackLng },
                address: 'Bengaluru (Demo)' 
            }));
            fetchLiveStores(fallbackLat, fallbackLng, true).then(stores => {
                setAvailableStores(stores);
                setActiveStore(stores[0]);
            });
        } else {
            alert("Location access is required to find local stores. Please enable location permissions.");
        }
        setIsLoading(false);
    };

    navigator.geolocation.getCurrentPosition(
        handleSuccess,
        (highAccuracyError) => {
            console.log("High accuracy location failed, retrying...", highAccuracyError.message);
            navigator.geolocation.getCurrentPosition(handleSuccess, handleError, { enableHighAccuracy: false, timeout: 15000, maximumAge: 0 });
        },
        { enableHighAccuracy: true, timeout: 8000, maximumAge: 0 }
    );

  }, [user.id, cart]); 

  // 2. Load Products
  useEffect(() => {
    if (!activeStore) {
        setProducts([]);
        return;
    }
    
    setIsProductLoading(true);
    setProducts([]); 

    const isMockStore = activeStore.id.startsWith('demo-') || activeStore.id.startsWith('local-') || activeStore.id.startsWith('osm-') || activeStore.id.startsWith('blr-');

    if (isMockStore && activeStore.availableProductIds && activeStore.availableProductIds.length > 0) {
        setTimeout(() => {
            const storeHash = activeStore.id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
            const priceMultiplier = 0.9 + (storeHash % 20) / 100;

            const filteredProducts = INITIAL_PRODUCTS
                .filter(p => activeStore.availableProductIds.includes(p.id))
                .map(p => {
                    const newPrice = Math.ceil(p.price * priceMultiplier);
                    return {
                        ...p,
                        price: newPrice,
                        brands: p.brands?.map(b => ({ ...b, price: Math.ceil(b.price * priceMultiplier) }))
                    };
                });
            setProducts(filteredProducts);
            setIsProductLoading(false);
        }, 500);
        return;
    }

    const loadProducts = async () => {
        try {
            const liveProducts = await getStoreProducts(activeStore.id);
            // If live fetch returns empty, and we aren't a mock store, we just show empty.
            // DO NOT FALLBACK to mock data for real stores.
            setProducts(liveProducts);
        } catch (e) {
            console.error("Failed to load products", e);
            setProducts([]);
        } finally {
            setIsProductLoading(false);
        }
    };
    loadProducts();
  }, [activeStore]);

  // 3. Cart Logic
  const addToCart = (product: Product, quantity = 1, brand?: string, price?: number, variant?: Variant) => {
    if (!activeStore) { 
        alert("Please select a store first (Location needed)"); 
        return; 
    }
    
    if (cart.length > 0 && cart[0].storeId !== activeStore.id) {
        const confirmSwitch = window.confirm(
            `Your cart contains items from ${cart[0].storeName}. \n\nDo you want to discard the selection and start a fresh cart from ${activeStore.name}?`
        );
        if (!confirmSwitch) return;
        setCart([]);
    }

    const selectedBrand = brand || 'Generic';
    const finalPrice = price || product.price;
    const variantSuffix = variant ? `-${variant.name.replace(/\s+/g, '')}` : '';
    const cartId = `${product.id}-${selectedBrand}${variantSuffix}-${activeStore.id}`;

    let itemName = product.name;
    if (brand && brand !== 'Generic') itemName = `${brand} ${itemName}`;
    if (variant) itemName = `${itemName} (${variant.name})`;

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
            name: itemName,
            quantity,
            storeId: activeStore.id,
            storeName: activeStore.name,
            storeType: activeStore.type
        }];
    });

    showToast(`Added ${itemName} to Cart`);
  };

  const updateQuantity = (cartId: string, delta: number) => {
    setCart(prev => prev.map(item => 
      item.id === cartId ? { ...item, quantity: Math.max(0, item.quantity + delta) } : item
    ).filter(item => item.quantity > 0));
  };

  const clearCart = () => setCart([]);

  const showToast = (message: string, action?: { label: string, onClick: () => void }) => {
      setToast({ show: true, message, action });
  };
  const hideToast = () => setToast({ ...toast, show: false });

  const toggleFavorite = (productId: string) => {
      setFavorites(prev => {
          if (prev.includes(productId)) {
              showToast("Removed from Favorites");
              return prev.filter(id => id !== productId);
          }
          showToast("Added to Favorites");
          return [...prev, productId];
      });
  };
  const isFavorite = (productId: string) => favorites.includes(productId);

  return (
    <StoreContext.Provider value={{
      user, setUser,
      cart, addToCart, updateQuantity, clearCart,
      activeStore, setActiveStore, availableStores,
      products,
      orderMode, setOrderMode,
      detectLocation,
      isLoading,
      isProductLoading,
      orders, addOrder, activeOrder, driverLocations, currentView, setCurrentView,
      toast, showToast, hideToast,
      favorites, toggleFavorite, isFavorite,
      pendingStoreSwitch, resolveStoreSwitch,
      viewingProduct, setViewingProduct
    }}>
      {children}
    </StoreContext.Provider>
  );
};

export const useStore = () => {
  const context = useContext(StoreContext);
  if (!context) throw new Error("useStore must be used within StoreProvider");
  return context;
};
