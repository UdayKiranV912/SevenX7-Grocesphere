
import { supabase } from './supabaseClient';
import { Store, Product } from '../types';
import { INITIAL_PRODUCTS, MOCK_STORES, DAIRY_IDS, PRODUCE_IDS, GENERAL_IDS } from '../constants';
import { findNearbyStores } from './geminiService';

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
  upi_id?: string; // UPI ID for payments
}

// Generate stores around the current location (ONLY FOR DEMO MODE)
const generateLocalStores = (centerLat: number, centerLng: number): Store[] => {
    // Expanded Mock Data for Demo Experience
    const stores: Store[] = [
        {
            id: 'demo-gen-1',
            name: 'Fresh Basket Supermarket',
            address: '12, Main Road, Near Park',
            lat: centerLat + 0.002,
            lng: centerLng + 0.002,
            rating: 4.6,
            distance: '',
            isOpen: true,
            type: 'general',
            availableProductIds: GENERAL_IDS,
            upiId: 'freshbasket@oksbi'
        },
        {
            id: 'demo-prod-1',
            name: 'Green Leaf Organics',
            address: 'Market Lane, Opp. Station',
            lat: centerLat - 0.0015,
            lng: centerLng + 0.001,
            rating: 4.9,
            distance: '',
            isOpen: true,
            type: 'produce',
            availableProductIds: PRODUCE_IDS,
            upiId: 'greenleaf@okhdfc'
        },
        {
            id: 'demo-dairy-1',
            name: 'Creamy Delights Dairy',
            address: '4th Cross, Residential Area',
            lat: centerLat + 0.001,
            lng: centerLng - 0.002,
            rating: 4.7,
            distance: '',
            isOpen: true,
            type: 'dairy',
            availableProductIds: DAIRY_IDS,
            upiId: 'creamy@okicici'
        },
        {
            id: 'demo-gen-2',
            name: 'Quick Stop Groceries',
            address: 'High Street Corner',
            lat: centerLat - 0.003,
            lng: centerLng - 0.001,
            rating: 4.3,
            distance: '',
            isOpen: true,
            type: 'general',
            availableProductIds: GENERAL_IDS,
            upiId: 'quickstop@okaxis'
        },
        {
            id: 'demo-veg-2',
            name: 'Farm to Home',
            address: 'Sector 5, Blue Building',
            lat: centerLat + 0.003,
            lng: centerLng - 0.003,
            rating: 4.5,
            distance: '',
            isOpen: true,
            type: 'produce',
            availableProductIds: PRODUCE_IDS,
            upiId: 'farmtohome@oksbi'
        },
        {
            id: 'demo-gen-3',
            name: 'Daily Needs Store',
            address: 'Apartment Complex Gate 2',
            lat: centerLat - 0.0005,
            lng: centerLng + 0.004,
            rating: 4.1,
            distance: '',
            isOpen: true,
            type: 'general',
            availableProductIds: GENERAL_IDS,
            upiId: 'dailyneeds@paytm'
        },
        {
            id: 'demo-dairy-2',
            name: 'Morning Fresh Milk',
            address: 'Temple Road',
            lat: centerLat + 0.0025,
            lng: centerLng - 0.0015,
            rating: 4.4,
            distance: '',
            isOpen: true,
            type: 'dairy',
            availableProductIds: DAIRY_IDS,
            upiId: 'morningfresh@okicici'
        }
    ];

    return stores.map(s => ({
        ...s,
        distance: `${calculateDistance(centerLat, centerLng, s.lat, s.lng).toFixed(1)} km`
    }));
};

/**
 * Fetch stores based on user mode.
 * 
 * DEMO MODE: 
 * - Generates mock stores around the user's LIVE location.
 * - Adds static mock stores calculated relative to LIVE location.
 * 
 * REAL-TIME USER:
 * - Queries Supabase (Admin Approved Stores).
 * - IF NO STORES found in DB -> Returns empty array (UI handles "Services Starting Soon").
 * - DOES NOT fallback to OSM or Mock data.
 */
export const fetchLiveStores = async (lat: number, lng: number, isDemo: boolean): Promise<Store[]> => {
  
  // --- DEMO MODE FLOW ---
  if (isDemo) {
    // 1. Generate local stores around the user's LIVE location (ensures they always have a store nearby in demo)
    const dynamicStores = generateLocalStores(lat, lng);
    
    // 2. Also include ALL Mock stores (Comprehensive List)
    // We recalculate their distance relative to the user's LIVE location
    const staticStores = MOCK_STORES.map(s => ({
        ...s,
        distance: `${calculateDistance(lat, lng, s.lat, s.lng).toFixed(1)} km`
    }));

    // Combine and Sort by distance
    return [...dynamicStores, ...staticStores].sort((a, b) => parseFloat(a.distance) - parseFloat(b.distance));
  }

  // --- REAL-TIME USER FLOW ---
  try {
    // 1. Try Fetching from Supabase (Official Admin Approved Partners)
    // Using RPC if available for spatial query efficiency
    const { data: dbStores, error } = await supabase.rpc('get_nearby_stores', {
      lat,
      long: lng,
      radius_km: 15
    });

    if (error) {
        // If RPC fails (e.g., function missing), try raw select as fallback
        console.warn("RPC Fetch failed, trying raw select:", error.message);
        const { data: rawStores } = await supabase
            .from('stores')
            .select('*')
            .eq('is_approved', true) // Only approved stores
            .eq('is_open', true);
            
        if (rawStores) {
             // Client-side distance filter for raw select
             return rawStores
                .map((s: any) => ({
                    ...s,
                    distanceNumeric: calculateDistance(lat, lng, s.lat, s.lng)
                }))
                .filter((s: any) => s.distanceNumeric <= 15) // 15km radius
                .map((s: any) => ({
                    id: s.id,
                    name: s.name,
                    address: s.address,
                    lat: s.lat,
                    lng: s.lng,
                    rating: s.rating || 4.5,
                    distance: `${s.distanceNumeric.toFixed(1)} km`,
                    isOpen: s.is_open,
                    type: s.type,
                    availableProductIds: [], // Fetched later
                    upiId: s.upi_id // Get real UPI ID
                }))
                .sort((a: any, b: any) => parseFloat(a.distance) - parseFloat(b.distance));
        }
        return [];
    }

    // Process RPC Results
    if (dbStores && dbStores.length > 0) {
        const stores = await Promise.all(dbStores.map(async (store: DBStore) => {
          // Check if store actually has inventory
          const { data: invData } = await supabase
            .from('inventory')
            .select('product_id')
            .eq('store_id', store.id)
            .eq('in_stock', true)
            .limit(1); // Just check existence to determine availability

           // Optimization: We fetch full product list only when selected
           // Here we just map the store details
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
            availableProductIds: [], // Will be populated by fetchStoreProducts
            upiId: store.upi_id // Get real UPI ID
          };
        }));

        return stores.sort((a, b) => parseFloat(a.distance) - parseFloat(b.distance));
    }

    // If no DB stores found, return empty.
    // Logic: Real users should NOT see fake stores. 
    // The UI will display "Services Starting Soon".
    return [];

  } catch (error) {
    console.error("Critical Store Service Error:", error);
    return [];
  }
};

/**
 * Fetch products for a specific store.
 * If Store ID is from Mock/OSM Data, return Mock Products.
 * If Store ID is UUID (Real), return DB Products.
 */
export const fetchStoreProducts = async (storeId: string): Promise<Product[]> => {
  // Check if it's a mock or OSM store ID
  const isExternal = storeId.startsWith('demo-') || storeId.startsWith('local-') || storeId.startsWith('osm-') || storeId.startsWith('blr-');

  if (isExternal) {
      // Return catalog products. 
      return INITIAL_PRODUCTS;
  }

  // REAL MODE: Fetch from DB
  try {
    const { data: inventory, error: invError } = await supabase
      .from('inventory')
      .select(`
        price,
        in_stock,
        product:products (
          id,
          name,
          emoji,
          category,
          description
        )
      `)
      .eq('store_id', storeId)
      .eq('in_stock', true);

    if (invError) {
      console.warn("Live DB fetch failed, falling back to static catalog", invError);
      throw invError;
    }

    if (inventory && inventory.length > 0) {
      // Map DB result to App Product Type
      return inventory.map((item: any) => ({
        id: item.product.id,
        name: item.product.name,
        emoji: item.product.emoji || '📦',
        price: item.price, // Store specific price
        category: item.product.category || 'General',
        description: item.product.description,
        brands: [] // Simple inventory for now
      }));
    }

    // If real store but empty inventory
    return [];

  } catch (err) {
    console.error("Error fetching store products", err);
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
