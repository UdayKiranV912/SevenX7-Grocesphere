
import { supabase } from './supabaseClient';
import { Product } from '../types';
import { INITIAL_PRODUCTS } from '../constants';

export const getStoreProducts = async (storeId: string): Promise<Product[]> => {
  try {
    // 1. Try fetching from Supabase 'inventory' joined with 'products'
    // This assumes a schema where products are shared, and inventory defines availability/price per store.
    const { data, error } = await supabase
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

    if (error) {
      console.warn("Live DB fetch failed, falling back to static catalog", error);
      throw error;
    }

    if (data && data.length > 0) {
      // Map DB result to App Product Type
      return data.map((item: any) => ({
        id: item.product.id,
        name: item.product.name,
        emoji: item.product.emoji || '📦',
        price: item.price, // Store specific price
        category: item.product.category || 'General',
        description: item.product.description,
        brands: [] // Simple inventory for now
      }));
    }

    // Fallback: If no DB rows, use INITIAL_PRODUCTS but simulated
    console.log("No live products found, using fallback catalog for store:", storeId);
    return INITIAL_PRODUCTS;

  } catch (err) {
    return INITIAL_PRODUCTS;
  }
};
