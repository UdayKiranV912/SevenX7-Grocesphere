
import { supabase } from './supabaseClient';
import { Store, Product } from '../types';
import { INITIAL_PRODUCTS, MOCK_STORES, DAIRY_IDS, PRODUCE_IDS, GENERAL_IDS } from '../constants';

// --- Database Types ---
interface DBStore {
  id: string;
  name: string;
  address: string;
  lat: number;
  lng: number;
  type: 'general' | 'produce' | 'dairy';
  is_open: boolean;
  rating: number;
}

// Generate stores around the current location for Demo Mode
const generateDemoStores = (centerLat: number, centerLng: number): Store[] => {
    const stores: Store[] = [
        {
            id: 'demo-gen-1',
            name: 'Demo General Store',
            address: 'Main Road (Demo)',
            lat: centerLat + 0.0015,
            lng: centerLng + 0.0015,
            rating: 4.5,
            distance: '',
            isOpen: true,
            type: 'general',
            availableProductIds: GENERAL_IDS
        },
        {
            id: 'demo-prod-1',
            name: 'Farm Fresh Demo',
            address: 'Market Lane (Demo)',
            lat: centerLat - 0.002,
            lng: centerLng + 0.001,
            rating: 4.8,
            distance: '',
            isOpen: true,
            type: 'produce',
            availableProductIds: PRODUCE_IDS
        },
        {
            id: 'demo-dairy-1',
            name: 'Morning Dairy Demo',
            address: 'Cross Road (Demo)',
            lat: centerLat + 0.001,
            lng: centerLng - 0.002,
            rating: 4.3,
            distance: '',
            isOpen: true,
            type: 'dairy',
            availableProductIds: DAIRY_IDS
        },
         {
            id: 'demo-gen-2',
            name: 'Super Mart Demo',
            address: 'High Street (Demo)',
            lat: centerLat - 0.003,
            lng: centerLng - 0.003,
            rating: 4.2,
            distance: '',
            isOpen: true,
            type: 'general',
            availableProductIds: GENERAL_IDS
        }
    ];

    return stores.map(s => ({
        ...s,
        distance: `${calculateDistance(centerLat, centerLng, s.lat, s.lng).toFixed(1)} km`
    }));
};

/**
 * Fetch stores based on user mode.
 * If isDemo is true, returns generated mock stores around user AND static Bengaluru mock stores.
 * If isDemo is false, returns strictly DB stores (or empty if none).
 */
export const fetchLiveStores = async (lat: number, lng: number, isDemo: boolean): Promise<Store[]> => {
  if (isDemo) {
    // Generate stores nearby the user's current location so they always see something
    const dynamicStores = generateDemoStores(lat, lng);
    
    // Also include the static Bengaluru stores sorted by distance
    const staticStores = MOCK_STORES.map(store => ({
        ...store,
        distance: `${calculateDistance(lat, lng, store.lat, store.lng).toFixed(1)} km`
    }));

    // Combine and return closest ones
    return [...dynamicStores, ...staticStores]
        .sort((a, b) => parseFloat(a.distance) - parseFloat(b.distance))
        .slice(0, 20);
  }

  try {
    // REAL MODE: Fetch ONLY from Supabase
    // Using RPC 'get_nearby_stores' is preferred for spatial query
    const { data: dbStores, error } = await supabase.rpc('get_nearby_stores', {
      lat,
      long: lng,
      radius_km: 15 // Search within 15km
    });

    if (error) {
        console.error("DB Store Fetch Error:", error);
        return [];
    }

    if (!dbStores || dbStores.length === 0) {
      return [];
    }

    // Process Real Stores
    const storesWithInventory = await Promise.all(dbStores.map(async (store: DBStore) => {
      // Check if store has ANY inventory to determine 'availableProductIds'
      // This is a lightweight check. Full products are loaded on selection.
      const { data: invData } = await supabase
        .from('inventory')
        .select('product_id')
        .eq('store_id', store.id)
        .eq('in_stock', true);

      const productIds = invData ? invData.map((i: any) => i.product_id) : [];

      return {
        id: store.id,
        name: store.name,
        address: store.address || '',
        rating: store.rating || 4.5,
        distance: `${calculateDistance(lat, lng, store.lat, store.lng).toFixed(1)} km`,
        lat: store.lat,
        lng: store.lng,
        isOpen: store.is_open,
        type: store.type,
        availableProductIds: productIds // If empty, store shows up but has no items (correct behavior for unmanaged stores)
      };
    }));

    return storesWithInventory;

  } catch (error) {
    console.error("Critical Store Service Error:", error);
    return [];
  }
};

/**
 * Fetch products for a specific store.
 * If Store ID is from Mock Data, return Mock Products.
 * If Store ID is UUID (Real), return DB Products.
 */
export const fetchStoreProducts = async (storeId: string): Promise<Product[]> => {
  // Check if it's a mock store ID (starts with 'blr-' or 'demo-')
  const isMock = storeId.startsWith('blr-') || storeId.startsWith('demo-');

  if (isMock) {
      // Return catalog products. 
      // Note: Availability filtering is handled by the caller (App.tsx) using activeStore.availableProductIds
      // This allows the full catalog to be available for reference if needed.
      return INITIAL_PRODUCTS;
  }

  // REAL MODE: Fetch from DB
  try {
    const { data: inventory, error: invError } = await supabase
      .from('inventory')
      .select('product_id, price, in_stock')
      .eq('store_id', storeId)
      .eq('in_stock', true);

    if (invError) throw invError;
    if (!inventory || inventory.length === 0) return [];

    // Map Inventory IDs to Product Details.
    const products = inventory.map(inv => {
      const catalogItem = INITIAL_PRODUCTS.find(p => p.id === inv.product_id);
      if (catalogItem) {
        return {
          ...catalogItem,
          price: inv.price // REAL STORE PRICE
        };
      }
      return null;
    }).filter(Boolean) as Product[];

    return products;

  } catch (error) {
    console.error("Error fetching store inventory:", error);
    return [];
  }
};

/**
 * Real-time Subscription
 */
export const subscribeToStoreInventory = (storeId: string, onUpdate: () => void) => {
    return supabase
        .channel(`inventory-updates-${storeId}`)
        .on(
            'postgres_changes',
            { event: '*', schema: 'public', table: 'inventory', filter: `store_id=eq.${storeId}` },
            (payload) => {
                onUpdate();
            }
        )
        .subscribe();
};

// Helper
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
