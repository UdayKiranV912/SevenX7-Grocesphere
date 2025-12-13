
import { supabase } from './supabaseClient';
import { Order, CartItem, PaymentSplit } from '../types';

// 1. Place Order (Transactional)
export const placeOrder = async (
  userId: string,
  storeId: string,
  items: CartItem[],
  total: number,
  location: { lat: number; lng: number },
  address: string,
  splits: PaymentSplit,
  deliveryType: string,
  scheduledTime?: string
): Promise<Order | null> => {
  try {
    // A. Insert Order Header
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .insert({
        customer_id: userId,
        store_id: storeId,
        status: 'placed', // Initial status
        total_amount: total,
        delivery_address: address,
        delivery_lat: location.lat,
        delivery_lng: location.lng,
        delivery_type: deliveryType,
        scheduled_time: scheduledTime,
        items: items // Snapshot for quick UI rendering
      })
      .select()
      .single();

    if (orderError) throw orderError;

    // B. Insert Order Items (For Inventory Management)
    const orderItems = items.map(item => ({
      order_id: order.id,
      product_id: item.originalProductId,
      store_id: storeId,
      quantity: item.quantity,
      unit_price: item.price
    }));

    const { error: itemsError } = await supabase
      .from('order_items')
      .insert(orderItems);
      
    if (itemsError) console.error("Item insertion warning:", itemsError);

    // C. Insert Payment Splits (For Store/Driver/Admin calculation)
    const { error: splitError } = await supabase
        .from('payment_splits')
        .insert({
            order_id: order.id,
            store_amount: splits.storeAmount,
            delivery_fee: splits.deliveryFee,
            total_paid_by_customer: total,
            is_settled: true
        });

    if (splitError) console.error("Split insertion warning:", splitError);

    return {
        ...order,
        id: order.id,
        items: items, // Return the full items for UI
        total: order.total_amount,
        status: 'Pending', // Mapped from 'placed'
        date: order.created_at,
        storeName: items[0].storeName, // Helper
        mode: 'DELIVERY'
    } as Order;

  } catch (error) {
    console.error("Place Order Error:", error);
    throw error;
  }
};

// 2. Real-time Subscription
export const subscribeToOrder = (orderId: string, onUpdate: (status: string) => void) => {
  return supabase
    .channel(`order-${orderId}`)
    .on(
      'postgres_changes',
      {
        event: 'UPDATE',
        schema: 'public',
        table: 'orders',
        filter: `id=eq.${orderId}`
      },
      (payload) => {
        console.log("Realtime Order Update:", payload);
        onUpdate(payload.new.status);
      }
    )
    .subscribe();
};

export const getUserOrders = async (userId: string) => {
    const { data } = await supabase
        .from('orders')
        .select('*')
        .eq('customer_id', userId)
        .order('created_at', { ascending: false });
    return data || [];
};
