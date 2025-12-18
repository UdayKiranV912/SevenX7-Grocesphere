
import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { UserState, CartItem, Store, Product, OrderMode, Variant, Order, OrderType } from '../types';
import { INITIAL_PRODUCTS, MOCK_STORES } from '../constants';
import { fetchLiveStores, fetchStoreProducts } from '../services/storeService';
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
  
  orders: Order[];
  addOrder: (order: Order) => Promise<void>;
  activeOrder: Order | null;
  driverLocations: Record<string, { lat: number; lng: number }>;
  currentView: ViewState;
  setCurrentView: (view: ViewState) => void;

  viewingProduct: Product | null;
  setViewingProduct: (product: Product | null) => void;

  toast: { show: boolean; message: string; action?: { label: string, onClick: () => void } };
  showToast: (message: string, action?: { label: string, onClick: () => void }) => void;
  hideToast: () => void;

  pendingStoreSwitch: Store | null;
  resolveStoreSwitch: (accepted: boolean) => void;

  favorites: string[];
  toggleFavorite: (productId: string) => void;
  isFavorite: (productId: string) => boolean;
}

const StoreContext = createContext<StoreContextType | undefined>(undefined);

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
  
  const [currentView, setCurrentView] = useState<ViewState>('SHOP');
  const [viewingProduct, setViewingProduct] = useState<Product | null>(null);

  const [orders, setOrders] = useState<Order[]>([]);
  const [driverLocations, setDriverLocations] = useState<Record<string, {lat: number, lng: number}>>({});

  const [toast, setToast] = useState<{ show: boolean; message: string; action?: { label: string, onClick: () => void } }>({ show: false, message: '' });
  const [pendingStoreSwitch, setPendingStoreSwitch] = useState<Store | null>(null);

  const [favorites, setFavorites] = useState<string[]>(() => {
      try {
          const saved = localStorage.getItem('grocesphere_favorites');
          return saved ? JSON.parse(saved) : [];
      } catch (e) { return []; }
  });

  const [ignoredStores, setIgnoredStores] = useState<string[]>([]);
  const lastAlertTimeRef = useRef<number>(0);

  const activeOrder = orders.find(o => 
      o.status !== 'Delivered' && o.status !== 'Picked Up' && o.status !== 'Cancelled'
  ) || null;

  useEffect(() => {
      localStorage.setItem('grocesphere_favorites', JSON.stringify(favorites));
  }, [favorites]);

  useEffect(() => {
      localStorage.setItem('grocesphere_cart', JSON.stringify(cart));
  }, [cart]);

  const addOrder = async (newOrder: Order) => {
      setOrders(prev => [newOrder, ...prev]);
      if (user.id === 'demo-user') {
          const existingData = localStorage.getItem('grocesphere_orders');
          const existingOrders = existingData ? JSON.parse(existingData) : [];
          localStorage.setItem('grocesphere_orders', JSON.stringify([newOrder, ...existingOrders]));
      } else if (user.id) {
          try {
              // Ensure order_type is set based on store_type
              const finalOrder = {
                  ...newOrder,
                  order_type: (activeStore?.store_type || 'grocery') as OrderType
              };
              await saveOrder(user.id, finalOrder);
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
          if (savedOrders) setOrders(JSON.parse(savedOrders));
        } else if (user.id) {
          const dbOrders = await getUserOrders(user.id);
          setOrders(dbOrders);
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
            if (user.id !== 'demo-user') return o; // Only simulate for demo
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
    }, 15000);

    return () => clearInterval(statusInterval);
  }, [orders.length, user.id, user.isAuthenticated]);

  const detectLocation = useCallback(() => {
    if (!navigator.geolocation) {
        setIsLoading(false);
        return;
    }
    setIsLoading(true);
    navigator.geolocation.getCurrentPosition(async (pos) => {
        const { latitude, longitude } = pos.coords;
        setUser(prev => ({ ...prev, location: { lat: latitude, lng: longitude } }));
        try {
            const addressData = await reverseGeocode(latitude, longitude);
            if (addressData?.display_name) {
                setUser(prev => ({ ...prev, address: addressData.display_name.split(',')[0] }));
            }
            const stores = await fetchLiveStores(latitude, longitude, user.id === 'demo-user');
            if (stores.length > 0) {
                setAvailableStores(stores);
                setActiveStore(prev => {
                   if (prev && stores.find(s => s.id === prev.id)) return prev;
                   if (cart.length > 0) {
                       const found = stores.find(s => s.id === cart[0].storeId);
                       if (found) return found;
                   }
                   return stores[0];
                });
            } else {
                setAvailableStores([]);
                setActiveStore(null);
            }
        } catch (e) {
          console.error(e);
        } finally {
          setIsLoading(false);
        }
    }, () => setIsLoading(false), { enableHighAccuracy: true });
  }, [user.id, cart]);

  useEffect(() => {
    if (!activeStore) {
        setProducts([]);
        return;
    }
    setIsProductLoading(true);
    fetchStoreProducts(activeStore.id).then(res => {
        setProducts(res);
        setIsProductLoading(false);
    }).catch(() => setIsProductLoading(false));
  }, [activeStore]);

  const addToCart = (product: Product, quantity = 1, brand?: string, price?: number, variant?: Variant) => {
    if (!activeStore) return;
    if (cart.length > 0 && cart[0].storeId !== activeStore.id) {
        if (!window.confirm(`Clear cart from ${cart[0].storeName}?`)) return;
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
      setFavorites(prev => prev.includes(productId) ? prev.filter(id => id !== productId) : [...prev, productId]);
  };
  const isFavorite = (productId: string) => favorites.includes(productId);
  const resolveStoreSwitch = (accepted: boolean) => {
      if (accepted && pendingStoreSwitch) {
          setCart([]);
          setActiveStore(pendingStoreSwitch);
      }
      setPendingStoreSwitch(null);
  };

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
