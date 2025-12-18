
import { supabase } from './supabaseClient';
import { Order } from '../types';

export const saveOrder = async (userId: string, order: Order) => {
  try {
    const isMockStore = order.items[0].storeId.startsWith('demo-') || 
                        order.items[0].storeId.startsWith('blr-') ||
                        order.items[0].storeId.startsWith('osm-');

    if (isMockStore) {
        console.warn("Mock Store Order - Not saving to DB");
        return; 
    }

    // 1. Insert Parent Order
    const { data: orderData, error } = await supabase
      .from('orders')
      .insert({
        customer_id: userId,
        store_id: order.items[0].storeId, 
        status: 'placed',
        items: order.items, 
        total_amount: order.total,
        type: order.mode, // Corrected from mode to type as per SQL
        order_type: order.order_type || 'grocery', // Support grocery + local_ecommerce
        delivery_address: order.deliveryAddress,
        delivery_lat: order.userLocation?.lat,
        delivery_lng: order.userLocation?.lng,
        scheduled_time: order.scheduledTime,
        store_amount: order.splits?.storeAmount || 0,
        admin_amount: order.splits?.handlingFee || 0,
        delivery_amount: order.splits?.deliveryFee || 0,
        gst_amount: 0 // Placeholder
      })
      .select()
      .single();

    if (error) throw error;
    if (!orderData) throw new Error("Order creation failed");

    // 2. Insert Order Items (Normalized)
    const orderItemsPayload = order.items.map(item => ({
        order_id: orderData.id,
        product_id: item.originalProductId, 
        store_id: item.storeId,             
        unit_price: item.price,
        quantity: item.quantity
    }));

    const { error: itemsError } = await supabase
        .from('order_items')
        .insert(orderItemsPayload);

    if (itemsError) console.error("Error saving order items:", itemsError);

    // 3. Insert Payment Splits
    if (order.splits) {
        const { error: splitError } = await supabase
            .from('payment_splits')
            .insert({
                order_id: orderData.id,
                store_amount: order.splits.storeAmount,
                store_upi: order.splits.storeUpi,
                handling_fee: order.splits.handlingFee || 0,
                admin_upi: order.splits.adminUpi,
                delivery_fee: order.splits.deliveryFee,
                driver_upi: order.splits.driverUpi,
                total_paid_by_customer: order.total, 
                is_settled: order.paymentStatus === 'PAID'
            });
        
        if (splitError) console.error("Error saving splits:", splitError);
    }

    return orderData.id;
  } catch (err) {
    console.error('Supabase save failed:', err);
    throw err;
  }
};

export const getUserOrders = async (userId: string): Promise<Order[]> => {
  try {
    const { data, error } = await supabase
      .from('orders')
      .select('*')
      .eq('customer_id', userId)
      .order('created_at', { ascending: false });

    if (error) throw error;

    return data.map((row: any) => ({
        id: row.id,
        date: row.created_at,
        items: row.items, 
        total: row.total_amount,
        status: mapDbStatusToAppStatus(row.status),
        paymentStatus: row.store_amount > 0 ? 'PAID' : 'PENDING',
        mode: row.type || 'DELIVERY',
        order_type: row.order_type || 'grocery',
        deliveryType: row.scheduled_time ? 'SCHEDULED' : 'INSTANT',
        scheduledTime: row.scheduled_time,
        storeName: row.items?.[0]?.storeName || 'Store', 
        storeLocation: { lat: 0, lng: 0 }, 
        userLocation: { lat: row.delivery_lat, lng: row.delivery_lng }
    })) as Order[];
  } catch (err) {
    console.error('Supabase fetch failed:', err);
    return [];
  }
};

export const subscribeToUserOrders = (userId: string, onUpdate: (payload: any) => void) => {
    return supabase
        .channel(`user-orders-${userId}`)
        .on('postgres_changes', { 
            event: 'UPDATE', 
            schema: 'public', 
            table: 'orders', 
            filter: `customer_id=eq.${userId}` 
        }, (payload) => onUpdate(payload.new))
        .subscribe();
};

const mapDbStatusToAppStatus = (dbStatus: string): Order['status'] => {
    switch (dbStatus) {
        case 'placed': return 'Pending';
        case 'accepted': return 'Pending';
        case 'packing': return 'Preparing';
        case 'ready': return 'Ready';
        case 'on_way': return 'On the way';
        case 'delivered': return 'Delivered';
        case 'picked_up': return 'Picked Up';
        case 'cancelled': return 'Cancelled';
        default: return 'Pending';
    }
};
