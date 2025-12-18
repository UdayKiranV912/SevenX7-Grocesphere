
import React, { useState, useEffect, useRef } from 'react';
import { CartItem, DeliveryType, Store, Product } from '../types';
import { MapVisualizer } from './MapVisualizer';
import { INITIAL_PRODUCTS, MOCK_STORES } from '../constants';

// --- Helper Component for Row Animation ---
interface CartItemRowProps {
  item: CartItem;
  onUpdateQuantity: (id: string, delta: number) => void;
  index: number;
}

const CartItemRow: React.FC<CartItemRowProps> = ({ item, onUpdateQuantity, index }) => {
  const [isHighlighted, setIsHighlighted] = useState(false);
  const prevQty = useRef(item.quantity);

  useEffect(() => {
    if (prevQty.current !== item.quantity) {
      setIsHighlighted(true);
      const timer = setTimeout(() => setIsHighlighted(false), 300);
      prevQty.current = item.quantity;
      return () => clearTimeout(timer);
    }
  }, [item.quantity]);

  // Fake MRP calc
  const mrp = Math.ceil(item.price * 1.25);
  const savings = (mrp - item.price) * item.quantity;

  return (
    <div 
       className={`p-3 pr-4 rounded-2xl shadow-sm flex items-center gap-3 animate-slide-up border transition-all duration-300 ${
           isHighlighted 
             ? 'bg-brand-light border-brand-DEFAULT/30 scale-[1.02] shadow-md' 
             : 'bg-white border-slate-100/50 hover:shadow-md'
       }`}
       style={{ animationDelay: `${index * 50}ms` }}
     >
        {/* Emoji */}
        <div className="w-16 h-16 bg-slate-50 rounded-xl flex items-center justify-center text-3xl shrink-0">
            {item.emoji}
        </div>
        
        {/* Details */}
        <div className="flex-1 min-w-0 flex flex-col">
           <h3 className="font-bold text-slate-900 text-sm truncate leading-tight mb-1">{item.name}</h3>
           {item.selectedBrand && item.selectedBrand !== 'Generic' && (
               <span className="text-[10px] font-bold text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded w-fit mb-1">{item.selectedBrand}</span>
           )}
           <div className="flex items-center gap-2">
               <span className="text-xs font-black text-slate-900">₹{item.price}</span>
               <span className="text-[10px] text-slate-400 line-through">₹{mrp}</span>
               {savings > 0 && <span className="text-[9px] font-bold text-green-600 bg-green-50 px-1 rounded">Save ₹{mrp - item.price}</span>}
           </div>
        </div>
        
        {/* Controls */}
        <div className="flex flex-col items-end gap-1">
            <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg">
                <button 
                onClick={() => onUpdateQuantity(item.id, -1)}
                className="w-7 h-7 flex items-center justify-center bg-white rounded-md shadow-sm text-slate-600 hover:text-red-500 font-bold active:scale-90 touch-manipulation"
                >
                −
                </button>
                <span className={`w-6 text-center text-sm font-black text-slate-800`}>
                    {item.quantity}
                </span>
                <button 
                onClick={() => onUpdateQuantity(item.id, 1)}
                className="w-7 h-7 flex items-center justify-center bg-white rounded-md shadow-sm text-slate-600 hover:text-brand-DEFAULT font-bold active:scale-90 touch-manipulation"
                >
                +
                </button>
            </div>
            <div className="text-[10px] font-bold text-slate-500">₹{item.price * item.quantity}</div>
        </div>
     </div>
  );
};

// --- Shared Cart Details Component ---
export interface CartDetailsProps {
  cart: CartItem[];
  onProceedToPay: (details: { deliveryType: DeliveryType; scheduledTime?: string; isPayLater?: boolean; splits: any }) => void;
  onUpdateQuantity: (productId: string, delta: number) => void;
  onAddProduct: (product: Product) => void;
  mode: 'DELIVERY' | 'PICKUP';
  onModeChange: (mode: 'DELIVERY' | 'PICKUP') => void;
  deliveryAddress: string;
  onAddressChange: (address: string) => void;
  activeStore: Store | null;
  stores: Store[]; 
  userLocation: { lat: number; lng: number } | null;
  isPage?: boolean;
  onClose?: () => void;
  hideButton?: boolean;
}

export const CartDetails: React.FC<CartDetailsProps> = ({
  cart,
  onProceedToPay,
  onUpdateQuantity,
  onAddProduct,
  mode,
  onModeChange,
  deliveryAddress,
  onAddressChange,
  activeStore,
  stores,
  userLocation,
  isPage = false,
  onClose
}) => {
  const [deliveryType, setDeliveryType] = useState<DeliveryType>('INSTANT');
  const [scheduledTime, setScheduledTime] = useState('');
  const [minScheduledTime, setMinScheduledTime] = useState('');
  const [isLocatingAddress, setIsLocatingAddress] = useState(false);
  const [showSchedulePicker, setShowSchedulePicker] = useState(false);
  
  const MINIMUM_ORDER_VALUE = 1000; 
  const BASE_DELIVERY_FEE = 30;

  useEffect(() => {
    const now = new Date();
    now.setHours(now.getHours() + 1);
    const isoString = new Date(now.getTime() - (now.getTimezoneOffset() * 60000)).toISOString().slice(0, 16);
    setMinScheduledTime(isoString);
    if (!scheduledTime) setScheduledTime(isoString);
  }, []);

  const groupedItems = React.useMemo(() => {
    const groups: Record<string, CartItem[]> = {};
    cart.forEach(item => {
        if (!groups[item.storeId]) groups[item.storeId] = [];
        groups[item.storeId].push(item);
    });
    return groups;
  }, [cart]);

  const itemsTotal = cart.reduce((acc, item) => acc + (item.price * item.quantity), 0);
  const totalMRP = cart.reduce((acc, item) => acc + (Math.ceil(item.price * 1.25) * item.quantity), 0);
  const totalSavings = totalMRP - itemsTotal;
  
  const numStores = Object.keys(groupedItems).length;
  const isMovMet = itemsTotal >= MINIMUM_ORDER_VALUE;
  const deliveryFee = mode === 'DELIVERY' ? (isMovMet ? 0 : BASE_DELIVERY_FEE * numStores) : 0;
  const onlinePayableTotal = itemsTotal + deliveryFee;

  const handleUseCurrentLocation = async () => {
    setIsLocatingAddress(true);
    if (!navigator.geolocation) { alert("Geolocation not supported"); setIsLocatingAddress(false); return; }
    navigator.geolocation.getCurrentPosition(async (pos) => {
         const { latitude, longitude } = pos.coords;
         try {
            const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`);
            const data = await response.json();
            if (data?.display_name) onAddressChange(data.display_name);
         } catch(e) { console.error(e); }
         setIsLocatingAddress(false);
    }, () => setIsLocatingAddress(false));
  };

  const preparePaymentData = (isPayLater: boolean) => {
      onProceedToPay({ 
          deliveryType: showSchedulePicker ? 'SCHEDULED' : 'INSTANT', 
          scheduledTime: showSchedulePicker ? scheduledTime : undefined, 
          isPayLater,
          splits: {
              storeAmount: onlinePayableTotal,
              storeUpi: activeStore?.upiId || 'store@upi',
              handlingFee: 0, 
              adminUpi: 'uday@admin',
              deliveryFee: deliveryFee,
              driverUpi: 'driver@upi'
          }
      });
  };

  // Helper to calculate ETA based on distance string "X km"
  const calculateETA = (distanceStr?: string) => {
    if (!distanceStr) return '30-45 mins';
    const dist = parseFloat(distanceStr.replace(/[^\d.]/g, '')) || 0;
    // Base 15 mins prep + 5 mins per km
    const minTime = Math.ceil(15 + dist * 5);
    const maxTime = minTime + 10;
    return `${minTime}-${maxTime} mins`;
  };

  if (cart.length === 0 && isPage) {
    return (
      <div className="flex flex-col items-center justify-center h-[80vh] text-center px-6 animate-fade-in pb-20">
        <div className="w-24 h-24 bg-white rounded-full flex items-center justify-center text-5xl mb-6 shadow-soft text-slate-300 border border-slate-100">🛒</div>
        <h3 className="text-2xl font-black text-slate-800">Your Cart is Empty</h3>
        <p className="text-slate-400 font-medium mt-2 mb-8 max-w-xs mx-auto">Looks like you haven't added anything yet.</p>
        <button onClick={onClose} className="bg-slate-900 text-white font-bold py-4 px-10 rounded-2xl shadow-lg hover:scale-105 transition-all touch-manipulation">
          Start Shopping
        </button>
      </div>
    );
  }

  const mapStores = stores.filter(s => Object.keys(groupedItems).includes(s.id));

  return (
    <div className={`flex flex-col h-full ${isPage ? 'bg-[#F8FAFC]' : 'bg-[#F8FAFC]'}`}>
      
      {/* Mobile Sticky Header */}
      <div className={`px-5 py-4 bg-white/95 backdrop-blur-md flex justify-between items-center sticky top-0 z-20 border-b border-slate-100 ${!isPage && 'rounded-t-[2.5rem] pt-6'}`}>
         {!isPage && (
            <div className="absolute top-2 left-1/2 -translate-x-1/2 w-12 h-1.5 bg-slate-200 rounded-full cursor-pointer" onClick={onClose} />
         )}
         <div className="flex items-center gap-3">
            {isPage && <button onClick={onClose} className="text-2xl text-slate-500">←</button>}
            <div>
                <h2 className="text-xl font-black text-slate-800 leading-none">Your Cart</h2>
                <div className="flex items-center gap-2 mt-0.5">
                    <p className="text-xs text-slate-500 font-bold">{cart.reduce((a, b) => a + b.quantity, 0)} items</p>
                </div>
            </div>
         </div>
         <div className="flex items-center gap-2 bg-brand-light px-3 py-1 rounded-full">
            <span className="text-[10px] font-black text-brand-dark uppercase tracking-wide">
                {mode}
            </span>
         </div>
      </div>

      {/* Scrollable Content */}
      <div className="flex-1 overflow-y-auto px-4 py-4 hide-scrollbar space-y-4 pb-48">
         
         {/* Order Items */}
         <div className="space-y-4">
           {Object.entries(groupedItems).map(([storeId, items]) => {
              const storeItems = items as CartItem[];
              const storeInfo = storeItems[0];
              const storeObj = stores.find(s => s.id === storeId) || MOCK_STORES.find(s => s.id === storeId);
              const borderColorClass = storeInfo.storeType === 'produce' ? 'border-l-emerald-500' : 
                                       storeInfo.storeType === 'dairy' ? 'border-l-blue-500' : 'border-l-orange-500';
              const eta = mode === 'DELIVERY' ? calculateETA(storeObj?.distance) : 'Ready in 15 mins';

              return (
                  <div key={storeId} className={`bg-white p-4 rounded-2xl shadow-sm border-l-4 ${borderColorClass} animate-fade-in-up`}>
                      <div className="flex items-center gap-2 mb-3 pb-2 border-b border-slate-50">
                           <div className="flex-1">
                               <h3 className="font-black text-slate-800 text-xs">{storeInfo.storeName}</h3>
                               <p className="text-[10px] text-slate-400 font-bold flex items-center gap-2">
                                   <span>{storeObj ? storeObj.distance : 'Nearby'}</span>
                                   {mode === 'DELIVERY' && <span className="text-brand-DEFAULT bg-brand-light px-1.5 py-0.5 rounded-md">⚡ {eta}</span>}
                               </p>
                           </div>
                      </div>
                      <div className="space-y-3">
                          {storeItems.map((item, idx) => (
                            <CartItemRow key={item.id} item={item} index={idx} onUpdateQuantity={onUpdateQuantity} />
                          ))}
                      </div>
                  </div>
              );
           })}
         </div>

         {/* Delivery/Pickup & Scheduling */}
         <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100">
            <div className="grid grid-cols-2 gap-2 bg-slate-50 p-1 rounded-xl mb-4">
                <button 
                    onClick={() => onModeChange('DELIVERY')}
                    className={`py-2.5 rounded-lg text-xs font-black uppercase tracking-wide transition-all ${mode === 'DELIVERY' ? 'bg-white text-brand-DEFAULT shadow-sm' : 'text-slate-400'}`}
                >
                    Delivery
                </button>
                <button 
                    onClick={() => onModeChange('PICKUP')}
                    className={`py-2.5 rounded-lg text-xs font-black uppercase tracking-wide transition-all ${mode === 'PICKUP' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-400'}`}
                >
                    Pickup
                </button>
            </div>

            {/* Schedule Option */}
            <div className="mb-4">
                <label className="flex items-center gap-3 cursor-pointer p-3 rounded-xl border border-dashed border-slate-200 hover:bg-slate-50 transition-colors">
                    <input 
                        type="checkbox" 
                        checked={showSchedulePicker} 
                        onChange={(e) => setShowSchedulePicker(e.target.checked)}
                        className="w-5 h-5 rounded text-brand-DEFAULT focus:ring-brand-DEFAULT" 
                    />
                    <div className="flex-1">
                        <span className="block text-xs font-bold text-slate-800">Schedule {mode === 'DELIVERY' ? 'Delivery' : 'Pickup'}</span>
                        <span className="block text-[10px] text-slate-400">Order now, get it later</span>
                    </div>
                </label>

                {showSchedulePicker && (
                    <div className="mt-3 animate-slide-up">
                         <input 
                            type="datetime-local" 
                            value={scheduledTime}
                            min={minScheduledTime}
                            onChange={(e) => setScheduledTime(e.target.value)}
                            className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-700 outline-none focus:border-brand-DEFAULT"
                         />
                         <div className="flex items-center gap-2 mt-2 px-1">
                            <span className="text-lg">🔔</span>
                            <span className="text-[10px] font-bold text-slate-500">
                                We'll remind you 10 mins before {mode === 'DELIVERY' ? 'arrival' : 'pickup'}.
                            </span>
                         </div>
                    </div>
                )}
            </div>

            {mode === 'DELIVERY' && (
                <div className="space-y-2 animate-fade-in border-t border-slate-50 pt-4">
                    <div className="flex justify-between">
                        <label className="text-[10px] font-bold text-slate-400 uppercase">Delivery Address</label>
                        <button onClick={handleUseCurrentLocation} className="text-[10px] font-bold text-blue-600 flex items-center gap-1">
                            {isLocatingAddress ? 'Locating...' : '📍 Auto-Detect'}
                        </button>
                    </div>
                    <textarea
                        value={deliveryAddress}
                        onChange={(e) => onAddressChange(e.target.value)}
                        placeholder="House No, Street, Area..."
                        className="w-full bg-slate-50 border-0 rounded-xl p-3 text-xs font-bold text-slate-700 resize-none focus:ring-1 focus:ring-brand-DEFAULT"
                        rows={2}
                    />
                </div>
            )}
         </div>

         {/* Map (Small Preview) */}
         <div className="h-28 rounded-2xl overflow-hidden shadow-inner border border-white">
            <MapVisualizer 
                stores={mapStores}
                userLat={userLocation?.lat || 0}
                userLng={userLocation?.lng || 0}
                selectedStore={activeStore}
                onSelectStore={() => {}}
                mode={mode}
                showRoute={true} 
                className="h-full"
            />
         </div>
         
         {/* Bill Details */}
         <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 space-y-3">
             <h3 className="text-xs font-black text-slate-400 uppercase tracking-wide">Summary</h3>
             <div className="flex justify-between text-xs text-slate-500">
                 <span>Item Total</span>
                 <span className="font-bold">₹{itemsTotal}</span>
             </div>
             {mode === 'DELIVERY' && (
                 <div className="flex justify-between text-xs text-slate-500">
                    <span>Delivery Fee</span>
                    <span className={isMovMet ? 'text-brand-DEFAULT font-bold' : 'text-slate-800 font-bold'}>
                        {isMovMet ? 'Free' : `₹${deliveryFee}`}
                    </span>
                 </div>
             )}
             {totalSavings > 0 && (
                 <div className="flex justify-between text-xs text-green-600 font-bold bg-green-50 p-2 rounded-lg">
                    <span>Total Savings</span>
                    <span>- ₹{totalSavings}</span>
                 </div>
             )}
             <div className="flex justify-between text-xl font-black text-slate-900 pt-2 border-t border-slate-100">
                <span>Total</span>
                <span>₹{onlinePayableTotal}</span>
             </div>
         </div>
      </div>

      {/* Sticky Bottom Action */}
      <div className={`bg-white border-t border-slate-100 p-4 shadow-[0_-5px_20px_rgba(0,0,0,0.05)] z-30 ${isPage ? 'fixed bottom-16 left-0 right-0 pb-safe' : 'sticky bottom-0 pb-safe'}`}>
         <div className="max-w-md mx-auto">
             <button 
                onClick={() => preparePaymentData(false)}
                className="w-full py-4 bg-slate-900 text-white rounded-xl font-black text-sm shadow-xl active:scale-[0.98] transition-all flex items-center justify-center gap-2"
             >
                <span>Pay ₹{onlinePayableTotal}</span>
                <span className="bg-white/20 p-1 rounded-full">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" /></svg>
                </span>
             </button>
         </div>
      </div>
    </div>
  );
};

export const CartSheet: React.FC<CartDetailsProps> = (props) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const totalItems = props.cart.reduce((acc, item) => acc + item.quantity, 0);

  // --- Mobile Back Button Integration ---
  useEffect(() => {
    if (isExpanded) {
        // Push a state when opening
        window.history.pushState({ modal: 'CART' }, '');

        // Define cleanup listener
        const handlePopState = () => {
            setIsExpanded(false);
        };

        window.addEventListener('popstate', handlePopState);

        return () => {
            window.removeEventListener('popstate', handlePopState);
        };
    }
  }, [isExpanded]);

  // Prevent background scrolling when cart sheet is expanded
  useEffect(() => {
    if (isExpanded) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isExpanded]);

  const handleClose = () => {
      // If we are closing manually via button, we should go back in history
      // to remove the pushed state, IF we are currently at that state.
      // A simple check is tricky without a router, but typically:
      setIsExpanded(false);
      // We attempt to go back if state matches, otherwise we just close visually
      if (window.history.state?.modal === 'CART') {
          window.history.back();
      }
  };

  // If page mode, simply render the content
  if (props.isPage) {
      return <CartDetails {...props} />;
  }

  // If Sheet mode (Overlay)
  if (props.cart.length === 0 && !isExpanded) return null;

  return (
    <>
      {!isExpanded && !props.hideButton && props.cart.length > 0 && (
        <div className="fixed bottom-24 right-4 z-50 animate-scale-in">
          <button 
            onClick={() => setIsExpanded(true)}
            className="bg-slate-900 text-white pl-5 pr-2 py-2 rounded-full shadow-float flex items-center gap-3 hover:scale-105 active:scale-95 transition-all border border-slate-700 touch-manipulation"
          >
             <span className="font-bold text-sm">View Cart</span>
             <div className="bg-brand-DEFAULT text-white text-xs font-black h-10 w-10 flex items-center justify-center rounded-full border-4 border-slate-900">
                 {totalItems}
             </div>
          </button>
        </div>
      )}

      {isExpanded && (
        <div className="fixed inset-0 z-[70] flex flex-col justify-end isolate">
           <div 
             className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity animate-fade-in"
             onClick={handleClose}
           />
           <div className="relative w-full max-w-md mx-auto h-[90vh] bg-[#F8FAFC] rounded-t-[2.5rem] shadow-2xl overflow-hidden animate-slide-up">
              <CartDetails 
                {...props} 
                isPage={false} 
                onClose={handleClose} 
              />
           </div>
        </div>
      )}
    </>
  );
};
