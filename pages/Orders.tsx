
import React, { useEffect, useState } from 'react';
import { useStore } from '../contexts/StoreContext';
import { getUserOrders, subscribeToOrder } from '../services/orders';
import { Order } from '../types';
import { MapVisualizer } from '../components/MapVisualizer';

export const OrdersPage: React.FC = () => {
  const { user } = useStore();
  const [orders, setOrders] = useState<Order[]>([]);
  const [expandedOrderId, setExpandedOrderId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Status mapping for UI
  const mapStatus = (dbStatus: string): Order['status'] => {
      const mapping: Record<string, Order['status']> = {
          'placed': 'Pending',
          'packing': 'Preparing',
          'on_way': 'On the way',
          'delivered': 'Delivered',
          'picked_up': 'Picked Up',
          'cancelled': 'Cancelled'
      };
      return mapping[dbStatus] || 'Pending';
  };

  useEffect(() => {
    const fetchOrders = async () => {
      if (!user.id) return;
      setLoading(true);
      const dbOrders = await getUserOrders(user.id);
      
      const mappedOrders = dbOrders.map((o: any) => ({
          id: o.id,
          date: o.created_at,
          items: o.items || [],
          total: o.total_amount,
          status: mapStatus(o.status),
          paymentStatus: 'PAID',
          mode: 'DELIVERY',
          deliveryType: o.delivery_type || 'INSTANT',
          storeName: o.items?.[0]?.storeName || 'Store',
          storeLocation: { lat: 12.9716, lng: 77.5946 }, // In real app, join with stores table
          userLocation: { lat: o.delivery_lat, lng: o.delivery_lng }
      }));
      setOrders(mappedOrders);
      setLoading(false);
    };
    fetchOrders();
  }, [user.id]);

  // Real-time Subscriptions
  useEffect(() => {
    if (!user.id) return;
    const activeOrders = orders.filter(o => o.status !== 'Delivered' && o.status !== 'Cancelled');
    
    const subs = activeOrders.map(order => {
        return subscribeToOrder(order.id, (newStatus) => {
            setOrders(prev => prev.map(o => o.id === order.id ? { ...o, status: mapStatus(newStatus) } : o));
            // Trigger haptic feedback or toast here in a real PWA
        });
    });

    return () => { subs.forEach(s => s.unsubscribe()); };
  }, [orders.length, user.id]);

  if (loading) return <div className="text-center py-20"><div className="animate-spin text-2xl">⏳</div></div>;

  return (
    <div className="pb-32 px-5 space-y-6 pt-6 animate-fade-in">
      <h2 className="font-black text-slate-800 text-3xl">Your Orders</h2>
      
      {orders.length === 0 && (
          <div className="text-center py-10 opacity-50">
              <p className="text-4xl mb-2">🧾</p>
              <p className="font-bold">No active orders</p>
          </div>
      )}

      {orders.map((order) => {
          const isLive = order.status !== 'Delivered' && order.status !== 'Cancelled';
          
          return (
            <div key={order.id} className="bg-white rounded-[2rem] overflow-hidden shadow-card border border-slate-100 transition-all">
              {/* Map Preview for Active Orders */}
              {isLive && expandedOrderId === order.id && order.userLocation && (
                  <div className="h-48 w-full relative border-b border-slate-100">
                      <MapVisualizer 
                          stores={[]} // We pass empty because we just want route
                          selectedStore={{ lat: order.storeLocation?.lat || 0, lng: order.storeLocation?.lng || 0 } as any}
                          userLat={order.userLocation.lat}
                          userLng={order.userLocation.lng}
                          onSelectStore={() => {}}
                          mode="DELIVERY"
                          showRoute={true}
                          className="h-full rounded-none"
                      />
                      <div className="absolute top-2 right-2 bg-white/90 backdrop-blur px-3 py-1 rounded-full text-[10px] font-bold shadow-sm z-[1000]">
                          Live Tracking
                      </div>
                  </div>
              )}

              <div className="p-6 cursor-pointer" onClick={() => setExpandedOrderId(expandedOrderId === order.id ? null : order.id)}>
                  <div className="flex justify-between items-start mb-4">
                      <div>
                          <h3 className="font-black text-slate-900 text-lg">{order.storeName}</h3>
                          <p className="text-xs font-bold text-slate-400 mt-1">
                              {new Date(order.date).toLocaleDateString()} • {new Date(order.date).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                          </p>
                      </div>
                      <div className={`px-4 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wide ${isLive ? 'bg-brand-light text-brand-dark animate-pulse' : 'bg-slate-100 text-slate-500'}`}>
                          {order.status}
                      </div>
                  </div>

                  {/* Progress Bar */}
                  {isLive && (
                      <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden mb-4">
                          <div 
                              className="bg-brand-DEFAULT h-full transition-all duration-1000 ease-out"
                              style={{ 
                                  width: order.status === 'Pending' ? '10%' : 
                                         order.status === 'Preparing' ? '30%' :
                                         order.status === 'On the way' ? '70%' : '100%' 
                              }}
                          ></div>
                      </div>
                  )}
                  
                  {expandedOrderId === order.id && (
                      <div className="mt-4 pt-4 border-t border-slate-50 animate-slide-up">
                          {order.items.map((item, i) => (
                              <div key={i} className="flex justify-between text-sm py-2 border-b border-slate-50 last:border-0">
                                  <div className="flex items-center gap-2">
                                      <span className="font-bold text-slate-400 text-xs">x{item.quantity}</span>
                                      <span className="text-slate-700 font-medium">{item.name}</span>
                                  </div>
                                  <span className="font-bold text-slate-900">₹{item.price * item.quantity}</span>
                              </div>
                          ))}
                          <div className="flex justify-between items-center mt-4 pt-2 border-t border-slate-100">
                              <span className="font-bold text-slate-500 text-xs uppercase">Total Paid</span>
                              <span className="font-black text-xl text-slate-900">₹{order.total}</span>
                          </div>
                      </div>
                  )}
              </div>
            </div>
          );
      })}
    </div>
  );
};
