
import { supabase } from './supabaseClient';
import { Store, Product } from '../types';
import { INITIAL_PRODUCTS, MOCK_STORES, DAIRY_IDS, PRODUCE_IDS, GENERAL_IDS } from '../constants';

const generateLocalStores = (centerLat: number, centerLng: number): Store[] => {
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
            store_type: 'grocery',
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
            store_type: 'grocery',
            availableProductIds: PRODUCE_IDS,
            upiId: 'greenleaf@okhdfc'
        }
    ];

    return stores.map(s => ({
        ...s,
        distance: `${calculateDistance(centerLat, centerLng, s.lat, s.lng).toFixed(1)} km`
    }));
};

export const fetchLiveStores = async (lat: number, lng: number, isDemo: boolean): Promise<Store[]> => {
  if (isDemo) {
    const dynamicStores = generateLocalStores(lat, lng);
    const staticStores = MOCK_STORES.map(s => ({
        ...s,
        store_type: (s.type === 'general' ? 'grocery' : 'local_ecommerce') as any, // Mock alignment
        distance: `${calculateDistance(lat, lng, s.lat, s.lng).toFixed(1)} km`
    }));
    return [...dynamicStores, ...staticStores].sort((a, b) => parseFloat(a.distance) - parseFloat(b.distance));
  }

  try {
    // 1. Try Fetching from Supabase via get_nearby_stores RPC
    const { data: dbStores, error } = await supabase.rpc('get_nearby_stores', {
      lat: lat,
      long: lng,
      radius_km: 15.0
    });

    if (error) {
        console.warn("RPC Fetch failed, falling back to raw select:", error.message);
        const { data: rawStores } = await supabase
            .from('stores')
            .select('*')
            .eq('is_verified', true)
            .eq('is_open', true);
            
        if (rawStores) {
             return rawStores
                .map((s: any) => ({
                    id: s.id,
                    name: s.name,
                    address: s.address,
                    lat: s.lat,
                    lng: s.lng,
                    rating: s.rating || 4.5,
                    distance: `${calculateDistance(lat, lng, s.lat, s.lng).toFixed(1)} km`,
                    isOpen: s.is_open,
                    type: s.type || 'general',
                    store_type: s.store_type || 'grocery',
                    availableProductIds: [],
                    upiId: s.upi_id 
                }))
                .sort((a: any, b: any) => parseFloat(a.distance) - parseFloat(b.distance));
        }
        return [];
    }

    if (dbStores && dbStores.length > 0) {
        return dbStores.map((store: any) => ({
            id: store.id,
            name: store.name,
            address: store.address || '',
            rating: store.rating || 4.5,
            distance: `${calculateDistance(lat, lng, store.lat, store.lng).toFixed(1)} km`,
            lat: store.lat,
            lng: store.lng,
            isOpen: store.is_open,
            type: store.type || 'general',
            store_type: store.store_type || 'grocery',
            availableProductIds: [],
            upiId: store.upi_id
        })).sort((a: any, b: any) => parseFloat(a.distance) - parseFloat(b.distance));
    }

    return [];
  } catch (error) {
    console.error("Critical Store Service Error:", error);
    return [];
  }
};

export const fetchStoreProducts = async (store: Store): Promise<Product[]> => {
  const storeId = store.id;
  const isExternal = storeId.startsWith('demo-') || storeId.startsWith('local-') || storeId.startsWith('osm-') || storeId.startsWith('blr-');

  // Logic: For external/demo stores, filter from our master INITIAL_PRODUCTS list 
  // based on the assigned inventory for that store type.
  if (isExternal) {
      if (store.availableProductIds && store.availableProductIds.length > 0) {
          return INITIAL_PRODUCTS.filter(p => store.availableProductIds.includes(p.id));
      }
      // If no inventory specified, return a safe general subset
      return INITIAL_PRODUCTS.filter(p => GENERAL_IDS.includes(p.id));
  }

  // Real-time Users: Fetch exactly what the store admin has enabled in their inventory
  try {
    const { data: inventory, error: invError } = await supabase
      .from('inventory')
      .select(`
        price,
        in_stock,
        mrp,
        product:products (
          id,
          name,
          emoji,
          category
        )
      `)
      .eq('store_id', storeId)
      .eq('in_stock', true);

    if (invError) throw invError;

    if (inventory && inventory.length > 0) {
      return inventory.map((item: any) => ({
        id: item.product.id,
        name: item.product.name,
        emoji: item.product.emoji || '📦',
        price: item.price, 
        category: item.product.category || 'General',
        mrp: item.mrp || item.price 
      }));
    }

    return [];
  } catch (err) {
    console.error("Error fetching store products", err);
    return [];
  }
};

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
