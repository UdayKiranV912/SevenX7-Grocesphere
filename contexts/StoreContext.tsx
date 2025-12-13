
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { UserState, CartItem, Store, Product, OrderMode } from '../types';
import { INITIAL_PRODUCTS, MOCK_STORES } from '../constants';
import { getStoreProducts } from '../services/products';
import { fetchLiveStores } from '../services/storeService';

interface StoreContextType {
  user: UserState;
  setUser: React.Dispatch<React.SetStateAction<UserState>>;
  cart: CartItem[];
  addToCart: (product: Product, quantity?: number, brand?: string, price?: number) => void;
  updateQuantity: (cartId: string, delta: number) => void;
  clearCart: () => void;
  activeStore: Store | null;
  setActiveStore: (store: Store) => void;
  availableStores: Store[];
  products: Product[];
  orderMode: OrderMode;
  setOrderMode: (mode: OrderMode) => void;
  detectLocation: () => void;
  isLoading: boolean;
}

const StoreContext = createContext<StoreContextType | undefined>(undefined);

export const StoreProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserState>({ isAuthenticated: false, phone: '', location: null });
  const [cart, setCart] = useState<CartItem[]>([]);
  const [activeStore, setActiveStore] = useState<Store | null>(null);
  const [availableStores, setAvailableStores] = useState<Store[]>([]);
  const [products, setProducts] = useState<Product[]>(INITIAL_PRODUCTS);
  const [orderMode, setOrderMode] = useState<OrderMode>('DELIVERY');
  const [isLoading, setIsLoading] = useState(false);

  // 1. Location & Store Discovery
  const detectLocation = useCallback(() => {
    if (!navigator.geolocation) return;
    setIsLoading(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude } = pos.coords;
        setUser(prev => ({ ...prev, location: { lat: latitude, lng: longitude } }));
        
        try {
          const isDemo = user.id === 'demo-user';
          const dbStores = await fetchLiveStores(latitude, longitude, isDemo);
          const stores = dbStores.length > 0 ? dbStores : MOCK_STORES;
          setAvailableStores(stores);
          // Only set active store if not already selected to prevent jumps
          setActiveStore(prev => prev || stores[0]); 
        } catch (e) {
          setAvailableStores(MOCK_STORES);
          setActiveStore(prev => prev || MOCK_STORES[0]);
        } finally {
          setIsLoading(false);
        }
      },
      (err) => {
        console.warn(err);
        setIsLoading(false);
      },
      { enableHighAccuracy: true }
    );
  }, [user.id]);

  // 2. Load Products when Store Changes
  useEffect(() => {
    if (!activeStore) return;
    const loadProducts = async () => {
        const liveProducts = await getStoreProducts(activeStore.id);
        setProducts(liveProducts);
    };
    loadProducts();
  }, [activeStore]);

  // 3. Cart Logic
  const addToCart = (product: Product, quantity = 1, brand?: string, price?: number) => {
    if (!activeStore) { alert("Please select a store first"); return; }
    
    const selectedBrand = brand || 'Generic';
    const finalPrice = price || product.price;
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
          name: brand && brand !== 'Generic' ? `${brand} ${product.name}` : product.name,
          quantity,
          storeId: activeStore.id,
          storeName: activeStore.name,
          storeType: activeStore.type
      }];
    });
  };

  const updateQuantity = (cartId: string, delta: number) => {
    setCart(prev => prev.map(item => 
      item.id === cartId ? { ...item, quantity: Math.max(0, item.quantity + delta) } : item
    ).filter(item => item.quantity > 0));
  };

  const clearCart = () => setCart([]);

  return (
    <StoreContext.Provider value={{
      user, setUser,
      cart, addToCart, updateQuantity, clearCart,
      activeStore, setActiveStore, availableStores,
      products,
      orderMode, setOrderMode,
      detectLocation,
      isLoading
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
