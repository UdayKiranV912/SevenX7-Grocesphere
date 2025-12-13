
import React, { useEffect, useState } from 'react';
import { Order, Store, OrderMode } from '../types';
import MapCustomer from './MapCustomer';
import { getUserOrders, subscribeToUserOrders } from '../services/orderService';
import { MapVisualizer } from './MapVisualizer';
import { useStore } from '../contexts/StoreContext';
import { MOCK_STORES } from '../constants';

interface MyOrdersProps {
  userLocation: { lat: number; lng: number } | null;
  onPayNow?: (order: Order) => void;
  userId?: string;
  onNavigateToShop?: () => void;
}

export const MyOrders: React.FC<MyOrdersProps> = ({ userLocation, onPayNow, userId, onNavigateToShop }) => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [expandedOrderId, setExpandedOrderId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [driverLocations, setDriverLocations] = useState<Record<string, {lat: number, lng: number}>>({});

  const { setActiveStore, availableStores } = useStore();

  // Fetch Orders on Mount or userId change
  useEffect(() => {
    const fetchOrders = async () => {
      setLoading(true);
      try {
        if (userId === 'demo-user') {
          // Demo Mode: Load from Local Storage
          const savedOrders = localStorage.getItem('grocesphere_orders');
          if (savedOrders) {
              setOrders(JSON.parse(savedOrders));
          } else {
              setOrders([]);
          }
        } else if (userId) {
          // Registered Mode: Load from Supabase DB
          const dbOrders = await getUserOrders(userId);
          setOrders(dbOrders);
        }
      } catch (error) {
        console.error("Failed to load orders:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchOrders();

    // REAL-TIME SUBSCRIPTION
    let subscription: any = null;
    if (userId && userId !== 'demo-user') {
        subscription = subscribeToUserOrders(userId, (updatedOrderDb) => {
            setOrders(prev => prev.map(o => {
                if (o.id === updatedOrderDb.id) {
                    // Map DB status to App Status
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

    return () => {
        if (subscription) subscription.unsubscribe();
    };

  }, [userId]);

  // Simulator for status updates (ONLY for Demo Mode)
  useEffect(() => {
    if (userId !== 'demo-user') return;

    const interval = setInterval(() => {
      setOrders(prevOrders => {
        const updatedOrders = prevOrders.map((o): Order => {
            if (o.deliveryType === 'SCHEDULED' && o.paymentStatus === 'PENDING') return o;
            if (o.status === 'Cancelled' || o.status === 'Delivered' || o.status === 'Picked Up') return o;

            if (o.status === 'Pending') return { ...o, status: 'Preparing' };
            if (o.status === 'Preparing') return { ...o, status: o.mode === 'DELIVERY' ? 'On the way' : 'Ready' };
            if (o.status === 'On the way') return { ...o, status: 'Delivered' };
            if (o.status === 'Ready') return { ...o, status: 'Picked Up' };
            return o;
        });
        localStorage.setItem('grocesphere_orders', JSON.stringify(updatedOrders));
        return updatedOrders;
      });
    }, 15000); 

    return () => clearInterval(interval);
  }, [userId]);

  // DRIVER LOCATION SIMULATOR (Interpolation) for Demo Mode
  useEffect(() => {
      if (!expandedOrderId || userId !== 'demo-user') return;
      
      const order = orders.find(o => o.id === expandedOrderId);
      if (!order || order.status !== 'On the way' || !order.storeLocation || !order.userLocation) return;
      
      let progress = 0;
      const interval = setInterval(() => {
          progress += 0.005; 
          if (progress > 1) progress = 0; 
          
          const lat = order.storeLocation!.lat + (order.userLocation!.lat - order.storeLocation!.lat) * progress;
          const lng = order.storeLocation!.lng + (order.userLocation!.lng - order.storeLocation!.lng) * progress;
          
          setDriverLocations(prev => ({...prev, [order.id]: {lat, lng}}));
      }, 50);

      return () => clearInterval(interval);
  }, [expandedOrderId, orders, userId]);

  const handleShopNow = (order: Order) => {
    const storeId = order.items[0]?.storeId;
    if (storeId) {
        // Try to find the store in currently available stores or mock stores
        const store = availableStores.find(s => s.id === storeId) || MOCK_STORES.find(s => s.id === storeId);
        
        if (store) {
            setActiveStore(store);
            if (onNavigateToShop) {
                onNavigateToShop();
            } else {
                alert(`Redirecting to ${store.name}...`);
            }
        } else {
            // Fallback if store data missing
            alert(`Store information for ${order.storeName} is not currently available.`);
        }
    }
  };

  if (loading) {
    return (
        <div className="flex flex-col items-center justify-center h-[60vh] text-center animate-fade-in">
            <div className="w-12 h-12 border-4 border-slate-200 border-t-brand-DEFAULT rounded-full animate-spin mb-4"></div>
            <p className="text-slate-400 font-bold text-sm">Loading History...</p>
        </div>
    );
  }

  if (orders.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] text-center px-6 animate-fade-in">
        <div className="w-24 h-24 bg-white rounded-full flex items-center justify-center text-5xl mb-6 shadow-soft text-slate-300 border border-slate-100">
           🧾
        </div>
        <h3 className="text-xl font-black text-slate-800">No Past Orders</h3>
        <p className="text-slate-400 mt-2 font-medium max-w-[200px] mx-auto">Your order history will appear here once you make a purchase.</p>
      </div>
    );
  }

  // Helper to determine status steps
  const getStatusInfo = (status: string, mode: OrderMode) => {
      const deliverySteps = ['Pending', 'Preparing', 'On the way', 'Delivered'];
      const pickupSteps = ['Pending', 'Preparing', 'Ready', 'Picked Up'];
      
      const steps = mode === 'DELIVERY' ? deliverySteps : pickupSteps;
      const currentIndex = steps.indexOf(status);
      const progress = ((currentIndex) / (steps.length - 1)) * 100;

      const getLabel = (step: string) => {
          if (step === 'Pending') return 'Placed';
          if (step === 'Preparing') return 'Packing';
          if (step === 'On the way') return 'On Way';
          if (step === 'Ready') return 'Ready';
          if (step === 'Picked Up') return 'Picked Up';
          return step;
      };

      const getIcon = (step: string) => {
          if (step === 'Pending') return '📝';
          if (step === 'Preparing') return '🥡';
          if (step === 'On the way') return '🛵';
          if (step === 'Ready') return '🛍️';
          if (step === 'Delivered' || step === 'Picked Up') return '🏠';
          return '•';
      };

      return { steps, currentIndex, progress, getLabel, getIcon };
  };

  return (
    <div className="pb-32 px-5 space-y-6 pt-4">
      <div className="flex items-center justify-between">
         <h2 className="font-black text-slate-800 text-2xl">History</h2>
         {userId === 'demo-user' && <span className="text-[10px] font-bold bg-slate-100 px-2 py-1 rounded text-slate-500">Demo Mode</span>}
         {userId !== 'demo-user' && <span className="text-[10px] font-bold bg-green-100 text-green-700 px-2 py-1 rounded animate-pulse">● Live Updates</span>}
      </div>
      
      {orders.map((order, idx) => {
        const isExpanded = expandedOrderId === order.id;
        const isCompleted = order.status === 'Delivered' || order.status === 'Picked Up';
        const isCancelled = order.status === 'Cancelled';
        const isPaymentPending = order.paymentStatus === 'PENDING';
        
        const { steps, currentIndex, progress, getLabel, getIcon } = getStatusInfo(order.status, order.mode);

        let statusColor = 'bg-blue-50 text-blue-700';
        if (isCompleted) statusColor = 'bg-green-50 text-green-700';
        if (isCancelled) statusColor = 'bg-red-50 text-red-700';
        if (order.status === 'Pending') statusColor = 'bg-yellow-50 text-yellow-700';
        if (isPaymentPending) statusColor = 'bg-orange-50 text-orange-700';

        const storeLoc: [number, number] = [order.storeLocation?.lat || 0, order.storeLocation?.lng || 0];
        const custLoc: [number, number] = [order.userLocation?.lat || 0, order.userLocation?.lng || 0];

        // Only show live MapCustomer for Delivery "On the way"
        const showLiveTracking = order.status === 'On the way' && order.mode === 'DELIVERY' && !isCancelled && !isPaymentPending;
        // Fallback demo driver
        const demoDriverLoc = driverLocations[order.id];

        return (
          <div 
            key={order.id} 
            className={`bg-white rounded-[2rem] p-5 shadow-sm border border-slate-100 transition-all cursor-pointer hover:shadow-md animate-slide-up ${isExpanded ? 'ring-2 ring-slate-100' : ''}`}
            style={{ animationDelay: `${idx * 100}ms` }}
            onClick={() => setExpandedOrderId(isExpanded ? null : order.id)}
          >
            {/* Header */}
            <div className="flex justify-between items-start mb-4">
               <div>
                  <h3 className="font-black text-slate-900 text-lg leading-tight">{order.storeName}</h3>
                  <div className="flex items-center gap-2 mt-1">
                      <span className="text-xs font-bold text-slate-400 uppercase">
                          {new Date(order.date).toLocaleDateString()}
                      </span>
                      <span className="text-xs font-black text-slate-300">•</span>
                      <span className="text-xs font-bold text-slate-800">₹{order.total}</span>
                  </div>
               </div>
               <div className={`px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wide border border-transparent ${statusColor}`}>
                   {isPaymentPending ? 'Payment Pending' : order.status}
               </div>
            </div>

            {!isCancelled && !isPaymentPending && (
                 <div className="mb-4 mt-2 px-1">
                    <div className="relative pb-6">
                        {/* Progress Bar Background */}
                        <div className="absolute top-4 left-0 w-full h-1 bg-slate-100 rounded-full z-0"></div>
                        
                        {/* Active Progress Bar */}
                        <div 
                            className="absolute top-4 left-0 h-1 bg-brand-DEFAULT rounded-full z-0 transition-all duration-1000 ease-out"
                            style={{ width: `${progress}%` }}
                        ></div>
                        
                        {/* Steps */}
                        <div className="flex justify-between relative z-10 w-full">
                            {steps.map((step, i) => {
                                const isActive = i === currentIndex;
                                const isDone = i < currentIndex;
                                const isFuture = i > currentIndex;
                                return (
                                    <div key={step} className="flex flex-col items-center relative">
                                        <div 
                                            className={`w-8 h-8 rounded-full flex items-center justify-center text-xs transition-all duration-500 border-[3px] 
                                            ${isDone ? 'bg-brand-DEFAULT border-brand-DEFAULT text-white' : ''}
                                            ${isActive ? 'bg-white border-brand-DEFAULT text-brand-DEFAULT scale-110 shadow-lg ring-4 ring-brand-light' : ''}
                                            ${isFuture ? 'bg-white border-slate-200 text-slate-300' : ''}
                                            `}
                                        >
                                            {isDone ? (
                                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                                                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                                </svg>
                                            ) : (
                                                <span>{getIcon(step)}</span>
                                            )}
                                        </div>
                                        
                                        {/* Label */}
                                        <span className={`absolute top-10 text-[9px] font-black uppercase tracking-wide whitespace-nowrap transition-colors duration-300 ${
                                            isActive ? 'text-brand-DEFAULT' : isDone ? 'text-brand-medium' : 'text-slate-300'
                                        }`}>
                                            {getLabel(step)}
                                        </span>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                 </div>
            )}

            {isExpanded && (
                <div className="mt-4 pt-4 border-t border-slate-50 animate-fade-in">
                    
                     {/* MAP SECTION */}
                    {!isCancelled && !isCompleted && !isPaymentPending && (
                        <div className="h-48 rounded-2xl overflow-hidden mb-6 border border-slate-100 shadow-inner relative z-0" onClick={(e) => e.stopPropagation()}>
                            {showLiveTracking ? (
                                <MapCustomer 
                                    orderId={order.id}
                                    store={storeLoc}
                                    customer={custLoc}
                                    className="h-full"
                                    storeName={order.storeName}
                                    storeRating={4.5}
                                    onShopNow={() => handleShopNow(order)}
                                />
                            ) : (
                                <MapVisualizer 
                                    stores={[]} 
                                    selectedStore={{lat: storeLoc[0], lng: storeLoc[1]} as any}
                                    userLat={custLoc[0]}
                                    userLng={custLoc[1]}
                                    mode={order.mode}
                                    onSelectStore={() => {}}
                                    showRoute={true}
                                    driverLocation={demoDriverLoc} // Use demo driver for non-live tracking (preparing/demo mode)
                                    className="h-full rounded-none"
                                />
                            )}
                        </div>
                    )}

                    <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3 pl-1">Order Items</h4>
                    <div className="space-y-3 mb-5">
                        {order.items.map((item, i) => (
                            <div key={i} className="flex justify-between items-center bg-slate-50/50 p-3 rounded-2xl border border-slate-100">
                                <div className="flex items-center gap-3">
                                    <div className="text-xl bg-white w-10 h-10 flex items-center justify-center rounded-xl shadow-sm border border-slate-50">
                                        {item.emoji}
                                    </div>
                                    <div>
                                        <div className="font-bold text-slate-800 text-sm">{item.name}</div>
                                        <div className="text-[10px] font-bold text-slate-400 mt-0.5">
                                            {item.quantity} unit{item.quantity > 1 ? 's' : ''} × ₹{item.price}
                                        </div>
                                    </div>
                                </div>
                                <div className="font-black text-slate-900 text-sm">
                                    ₹{item.price * item.quantity}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
          </div>
        );
      })}
    </div>
  );
};
