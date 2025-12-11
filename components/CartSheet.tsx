
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
    // Trigger animation when quantity changes
    if (prevQty.current !== item.quantity) {
      setIsHighlighted(true);
      const timer = setTimeout(() => setIsHighlighted(false), 300);
      prevQty.current = item.quantity;
      return () => clearTimeout(timer);
    }
  }, [item.quantity]);

  // Use stored MRP or fallback
  const mrp = item.mrp;
  const savings = mrp && mrp > item.price ? (mrp - item.price) * item.quantity : 0;

  return (
    <div 
       className={`p-3 rounded-[1.2rem] shadow-sm flex items-center gap-3 animate-slide-up border transition-all duration-300 ${
           isHighlighted 
             ? 'bg-brand-light border-brand-DEFAULT/30 scale-[1.02] shadow-md' 
             : 'bg-white border-slate-100/60 hover:border-slate-200'
       }`}
       style={{ animationDelay: `${index * 50}ms` }}
     >
        {/* Emoji */}
        <div className="w-14 h-14 bg-slate-50 rounded-2xl flex items-center justify-center text-3xl shrink-0 transition-transform duration-300 group-hover:scale-110 relative overflow-hidden shadow-inner">
            {item.emoji}
            {savings > 0 && (
                <div className="absolute bottom-0 left-0 right-0 bg-emerald-500 text-white text-[8px] font-bold text-center py-0.5 leading-none">
                    SAVE ₹{savings}
                </div>
            )}
        </div>
        
        {/* Details */}
        <div className="flex-1 min-w-0 flex flex-col justify-center gap-0.5">
           <h3 className="font-bold text-slate-800 text-sm truncate leading-tight">{item.name}</h3>
           {item.selectedBrand && item.selectedBrand !== 'Generic' && (
               <span className="text-[9px] font-bold text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded-md w-fit">{item.selectedBrand}</span>
           )}
           <div className="flex items-baseline gap-2 mt-0.5">
               <span className="text-sm font-black text-slate-900">₹{item.price}</span>
               {mrp && mrp > item.price && (
                   <span className="text-xs text-slate-400 line-through decoration-slate-300">₹{mrp}</span>
               )}
           </div>
        </div>
        
        {/* Controls */}
        <div className="flex flex-col items-center gap-1 bg-slate-100/80 p-1 rounded-xl">
            <button 
              onClick={() => onUpdateQuantity(item.id, 1)}
              className="w-7 h-7 flex items-center justify-center bg-white rounded-lg shadow-sm text-brand-DEFAULT hover:bg-brand-DEFAULT hover:text-white font-bold transition-all active:scale-90 touch-manipulation"
            >
              +
            </button>
            <span className={`w-7 text-center text-sm font-black text-slate-800 py-0.5 transition-all duration-300 ${isHighlighted ? 'scale-125 text-brand-DEFAULT' : ''}`}>
                {item.quantity}
            </span>
            <button 
              onClick={() => onUpdateQuantity(item.id, -1)}
              className="w-7 h-7 flex items-center justify-center bg-white rounded-lg shadow-sm text-slate-400 hover:text-red-500 font-bold transition-all active:scale-90 touch-manipulation"
            >
              −
            </button>
        </div>
     </div>
  );
};

// --- Helper for Suggestions ---
interface SuggestionsProps {
    suggestions: Product[];
    onAddProduct: (p: Product) => void;
}

const SuggestionsList: React.FC<SuggestionsProps> = ({ suggestions, onAddProduct }) => {
    if (suggestions.length === 0) return null;
    return (
        <div className="mt-4 pt-4 border-t border-slate-100 border-dashed">
            <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 px-1">You might have missed</h3>
            <div className="flex gap-3 overflow-x-auto pb-4 hide-scrollbar -mx-2 px-2 snap-x">
                {suggestions.map((product) => (
                    <div key={product.id} className="min-w-[130px] bg-white p-3 rounded-2xl border border-slate-100 flex flex-col snap-start flex-shrink-0 shadow-sm hover:shadow-md transition-shadow">
                        <div className="w-10 h-10 bg-slate-50 rounded-xl flex items-center justify-center text-xl self-center mb-2 shadow-inner">
                            {product.emoji}
                        </div>
                        <div className="font-bold text-slate-800 text-xs truncate mb-1 text-center">{product.name}</div>
                        <div className="flex justify-between items-center mt-auto pt-2 border-t border-slate-50">
                            <span className="text-xs font-bold text-slate-600">₹{product.price}</span>
                            <button 
                                onClick={() => onAddProduct(product)}
                                className="w-6 h-6 bg-slate-900 text-white rounded-lg flex items-center justify-center font-bold hover:bg-brand-DEFAULT transition-all shadow-sm active:scale-90 touch-manipulation"
                            >
                                +
                            </button>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}

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
  userLocation: { lat: number; lng: number; accuracy?: number } | null;
  isPage?: boolean;
  onClose?: () => void;
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
  
  // CONSTANTS
  const MINIMUM_ORDER_VALUE = 1000; 
  const BASE_DELIVERY_FEE = 30;

  const getLocalISO = (date: Date) => {
    const offset = date.getTimezoneOffset() * 60000; 
    return new Date(date.getTime() - offset).toISOString().slice(0, 16);
  };

  useEffect(() => {
    const now = new Date();
    now.setHours(now.getHours() + 1); // Minimum 1 hour ahead
    const isoString = getLocalISO(now);
    setMinScheduledTime(isoString);
    if (!scheduledTime) setScheduledTime(isoString);
  }, []);

  // Group Cart Items by Store
  const groupedItems = React.useMemo(() => {
    const groups: Record<string, CartItem[]> = {};
    cart.forEach(item => {
        if (!groups[item.storeId]) groups[item.storeId] = [];
        groups[item.storeId].push(item);
    });
    return groups;
  }, [cart]);

  const totalItems = cart.reduce((acc, item) => acc + item.quantity, 0);
  const itemsTotal = cart.reduce((acc, item) => acc + (item.price * item.quantity), 0);
  
  // Calculate Total Savings
  const totalSavings = cart.reduce((acc, item) => {
      const mrp = item.mrp || item.price; // Fallback to price if no MRP (no savings)
      const saving = Math.max(0, mrp - item.price);
      return acc + (saving * item.quantity);
  }, 0);

  // Calculate Fees
  const numStores = Object.keys(groupedItems).length;
  // If MOV Met (>1000), Delivery is Free (Store Pays). Else Customer pays.
  const isMovMet = itemsTotal >= MINIMUM_ORDER_VALUE;
  
  // Logic: 
  // Delivery Fee is now part of the TOTAL payable to Store.
  // Store will settle with driver later.
  const deliveryFee = mode === 'DELIVERY' ? (isMovMet ? 0 : BASE_DELIVERY_FEE * numStores) : 0;
  
  // Total to Pay ONLINE (To Store) includes delivery fee now
  const onlinePayableTotal = itemsTotal + deliveryFee;

  const isPayLaterAllowed = () => {
      if (deliveryType !== 'SCHEDULED' || !scheduledTime) return false;
      const slotTime = new Date(scheduledTime).getTime();
      const now = new Date().getTime();
      const diffMinutes = (slotTime - now) / 60000;
      return diffMinutes > 45; 
  };

  const handleUseCurrentLocation = async () => {
    setIsLocatingAddress(true);
    let lat = userLocation?.lat;
    let lng = userLocation?.lng;

    if (!lat || !lng) {
        try {
             const position = await new Promise<GeolocationPosition>((resolve, reject) => {
                if (!navigator.geolocation) reject(new Error("Geolocation not supported"));
                navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 8000 });
            });
            lat = position.coords.latitude;
            lng = position.coords.longitude;
        } catch (e) {
            alert("Could not access location. Please enter address manually.");
            setIsLocatingAddress(false);
            return;
        }
    }

    if (lat && lng) {
        try {
            const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`);
            const data = await response.json();
            if (data && data.display_name) {
                onAddressChange(data.display_name);
            } else {
                alert("Could not determine address from coordinates.");
            }
        } catch (error) {
            console.error("Geocoding failed", error);
            alert("Network error fetching address.");
        } finally {
            setIsLocatingAddress(false);
        }
    } else {
        setIsLocatingAddress(false);
    }
  };

  const preparePaymentData = (isPayLater: boolean) => {
      const splits = {
          storeAmount: onlinePayableTotal, 
          storeUpi: activeStore?.upiId || 'store@upi',
          handlingFee: 0, 
          adminUpi: 'uday@admin',
          deliveryFee: deliveryFee, 
          driverUpi: 'driver@upi'
      };

      onProceedToPay({ 
          deliveryType, 
          scheduledTime, 
          isPayLater,
          splits
      });
  };

  if (cart.length === 0 && isPage) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] text-center px-6 animate-fade-in">
        <div className="w-24 h-24 bg-white rounded-full flex items-center justify-center text-5xl mb-6 shadow-soft text-slate-300 border border-slate-100">
           🛒
        </div>
        <h3 className="text-2xl font-black text-slate-800">Your Cart is Empty</h3>
        <p className="text-slate-400 font-medium mt-2 mb-8 max-w-xs mx-auto">Looks like you haven't added anything yet. Start exploring fresh items!</p>
        <button 
           onClick={onClose}
           className="bg-slate-900 text-white font-bold py-4 px-10 rounded-2xl shadow-lg hover:scale-105 transition-all active:scale-95 touch-manipulation"
        >
          Start Shopping
        </button>
      </div>
    );
  }

  // Determine which stores to show on the map (all stores present in the cart)
  const cartStoreIds = Object.keys(groupedItems);
  const cartStoresForMap = stores.filter(s => cartStoreIds.includes(s.id));
  const mapStores = cartStoresForMap.length > 0 ? cartStoresForMap : (activeStore ? [activeStore] : []);

  // === MAIN LAYOUT ===
  // We use Flexbox to ensure header at top, footer at bottom, and content filling the middle.
  // This avoids absolute positioning issues on varying screen sizes.
  return (
    <div className={`flex flex-col h-full relative ${isPage ? 'bg-[#F8FAFC]' : 'bg-[#F8FAFC]'}`}>
      
      {/* 1. Header Section (Shrink 0) */}
      <div className="shrink-0 bg-white/95 backdrop-blur-xl z-20 shadow-sm rounded-t-[2.5rem]">
          {!isPage && (
            <div 
              className="w-full flex justify-center pt-5 pb-3 cursor-pointer"
              onClick={onClose}
            >
              <div className="w-12 h-1.5 bg-slate-200 rounded-full" />
            </div>
          )}

          <div className={`px-6 pb-6 flex justify-between items-end border-b border-slate-100 ${isPage ? 'pt-8' : ''}`}>
             <div>
                <h2 className="text-3xl font-black text-slate-800 tracking-tight">Checkout</h2>
                <div className="flex items-center gap-2 mt-1">
                    <span className={`w-2 h-2 rounded-full animate-pulse ${mode === 'DELIVERY' ? 'bg-emerald-500' : 'bg-blue-500'}`}></span>
                    <p className="text-xs text-slate-500 font-bold uppercase tracking-wider">
                        {mode === 'DELIVERY' ? 'Fast Delivery' : 'Store Pickup'}
                    </p>
                </div>
             </div>
             <div className="bg-slate-100 text-slate-600 px-4 py-2 rounded-full text-xs font-black shadow-inner border border-slate-200">
                {totalItems} items
             </div>
          </div>
      </div>

      {/* 2. Scrollable Content Section (Flex 1) */}
      <div className="flex-1 overflow-y-auto px-5 py-6 hide-scrollbar space-y-8"> 
         
         {/* Map Section */}
         <div className="rounded-[2.5rem] overflow-hidden shadow-card border-[3px] border-white h-48 relative ring-1 ring-slate-100 shrink-0">
            <MapVisualizer 
                stores={mapStores}
                userLat={userLocation?.lat || 0}
                userLng={userLocation?.lng || 0}
                userAccuracy={userLocation?.accuracy}
                selectedStore={activeStore} 
                onSelectStore={() => {}}
                mode={mode}
                showRoute={true} 
                enableExternalNavigation={mode === 'PICKUP'} 
                className="h-full"
            />
         </div>

         {/* GROUPED Order List */}
         <div className="space-y-6">
           {Object.entries(groupedItems).map(([storeId, items]: [string, CartItem[]]) => {
              const storeInfo = items[0]; 
              const storeObj = stores.find(s => s.id === storeId) || MOCK_STORES.find(s => s.id === storeId);
              
              const availableIds = storeObj?.availableProductIds || [];
              const cartIdsInThisStore = new Set(items.map(i => i.originalProductId));
              
              const storeSuggestions = INITIAL_PRODUCTS
                  .filter(p => availableIds.includes(p.id) && !cartIdsInThisStore.has(p.id))
                  .slice(0, 5); 

              const icon = storeInfo.storeType === 'produce' ? '🥦' : storeInfo.storeType === 'dairy' ? '🥛' : '🏪';

              return (
                  <div key={storeId} className="animate-fade-in-up">
                      {/* Store Header Bubble */}
                      <div className={`flex items-center gap-3 mb-3 px-2 py-1`}>
                           <div className={`w-8 h-8 rounded-full flex items-center justify-center text-lg shadow-sm bg-white border border-slate-100`}>
                               {icon}
                           </div>
                           <div className="flex-1">
                               <h3 className="font-black text-slate-800 text-sm leading-none">{storeInfo.storeName}</h3>
                               <p className="text-[10px] text-slate-400 font-bold uppercase mt-1">
                                   {storeObj ? storeObj.distance : 'Nearby'} • {storeInfo.storeType}
                               </p>
                           </div>
                      </div>

                      {/* Store Container */}
                      <div className="bg-white p-2 rounded-[2rem] shadow-card border border-slate-100">
                          {/* Items List */}
                          <div className="space-y-2 p-2">
                              {items.map((item, idx) => (
                                <CartItemRow 
                                    key={item.id} 
                                    item={item} 
                                    index={idx}
                                    onUpdateQuantity={onUpdateQuantity}
                                />
                              ))}
                          </div>

                          {/* Suggestions */}
                          {storeSuggestions.length > 0 && (
                              <div className="px-2 pb-2">
                                <SuggestionsList suggestions={storeSuggestions} onAddProduct={onAddProduct} />
                              </div>
                          )}
                      </div>
                  </div>
              );
           })}
         </div>

         {/* Options Section */}
         <div className="bg-white p-6 rounded-[2.5rem] shadow-card border border-slate-100 space-y-8 animate-fade-in relative z-0">
             
             {/* 1. Fulfillment Mode */}
            <div>
                 <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 block px-2">Order Type</label>
                 <div className="bg-slate-100 p-1.5 rounded-[1.5rem] flex relative">
                    {/* Sliding Background */}
                    <div className={`absolute top-1.5 bottom-1.5 w-[calc(50%-6px)] bg-white rounded-[1.2rem] shadow-md transition-all duration-300 ease-out ${mode === 'PICKUP' ? 'translate-x-[100%] ml-1.5' : 'translate-x-0'}`}></div>
                    
                    <button 
                        onClick={() => onModeChange('DELIVERY')}
                        className={`flex-1 py-3.5 rounded-[1.2rem] text-xs font-black uppercase tracking-wide transition-colors relative z-10 ${mode === 'DELIVERY' ? 'text-slate-900' : 'text-slate-400 hover:text-slate-600'}`}
                    >
                        Delivery
                    </button>
                    <button 
                        onClick={() => onModeChange('PICKUP')}
                        className={`flex-1 py-3.5 rounded-[1.2rem] text-xs font-black uppercase tracking-wide transition-colors relative z-10 ${mode === 'PICKUP' ? 'text-slate-900' : 'text-slate-400 hover:text-slate-600'}`}
                    >
                        Pickup
                    </button>
                </div>
            </div>

            {/* 2. Address Input */}
            {mode === 'DELIVERY' && (
                <div className="animate-fade-in">
                    <div className="flex justify-between items-center mb-3 px-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Delivery Location</label>
                        <button 
                            onClick={handleUseCurrentLocation}
                            disabled={isLocatingAddress}
                            className="text-[10px] font-bold text-blue-600 bg-blue-50 px-3 py-1.5 rounded-full flex items-center gap-1.5 hover:bg-blue-100 transition-colors touch-manipulation active:scale-95"
                        >
                            {isLocatingAddress ? <span className="animate-spin">⏳</span> : <span>📍</span>}
                            {isLocatingAddress ? 'Locating...' : 'Use Current'}
                        </button>
                    </div>
                    <div className="relative">
                        <textarea
                            value={deliveryAddress}
                            onChange={(e) => onAddressChange(e.target.value)}
                            placeholder="House / Flat No, Street, Landmark..."
                            className="w-full bg-slate-50 border border-slate-200 rounded-[1.5rem] p-5 text-sm font-bold text-slate-800 placeholder-slate-400 focus:ring-4 focus:ring-brand-light focus:border-brand-DEFAULT focus:bg-white resize-none shadow-inner transition-all outline-none"
                            rows={3}
                        />
                        <div className="absolute bottom-4 right-4 pointer-events-none text-slate-300">
                             ✏️
                        </div>
                    </div>
                </div>
            )}

            {/* 3. Time Slots */}
            <div>
                 <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 block px-2">Preferred Timing</label>
                 <div className="grid grid-cols-2 gap-4">
                     <button
                        onClick={() => setDeliveryType('INSTANT')}
                        className={`p-5 rounded-[1.5rem] border-2 text-left transition-all relative overflow-hidden touch-manipulation group ${
                            deliveryType === 'INSTANT' 
                            ? 'border-brand-DEFAULT bg-emerald-50/50 ring-2 ring-brand-DEFAULT/20' 
                            : 'border-slate-100 bg-slate-50 hover:bg-white hover:border-slate-200'
                        }`}
                     >
                         <div className={`w-10 h-10 rounded-full flex items-center justify-center text-xl mb-3 transition-colors ${deliveryType === 'INSTANT' ? 'bg-brand-DEFAULT text-white shadow-lg' : 'bg-white text-slate-400 shadow-sm'}`}>⚡</div>
                         <div className="font-black text-slate-800 text-sm">Instant</div>
                         <div className="text-[10px] font-bold text-slate-500 mt-0.5">~{mode === 'DELIVERY' ? '35' : '15'} mins</div>
                         
                         {deliveryType === 'INSTANT' && <div className="absolute top-3 right-3 text-brand-DEFAULT">✓</div>}
                     </button>

                     <button
                        onClick={() => setDeliveryType('SCHEDULED')}
                        className={`p-5 rounded-[1.5rem] border-2 text-left transition-all relative overflow-hidden touch-manipulation group ${
                            deliveryType === 'SCHEDULED' 
                            ? 'border-brand-DEFAULT bg-emerald-50/50 ring-2 ring-brand-DEFAULT/20' 
                            : 'border-slate-100 bg-slate-50 hover:bg-white hover:border-slate-200'
                        }`}
                     >
                         <div className={`w-10 h-10 rounded-full flex items-center justify-center text-xl mb-3 transition-colors ${deliveryType === 'SCHEDULED' ? 'bg-brand-DEFAULT text-white shadow-lg' : 'bg-white text-slate-400 shadow-sm'}`}>📅</div>
                         <div className="font-black text-slate-800 text-sm">Schedule</div>
                         <div className="text-[10px] font-bold text-slate-500 mt-0.5">Select Slot</div>

                         {deliveryType === 'SCHEDULED' && <div className="absolute top-3 right-3 text-brand-DEFAULT">✓</div>}
                     </button>
                 </div>
            </div>

            {deliveryType === 'SCHEDULED' && (
                 <div className="animate-slide-up bg-slate-50 p-4 rounded-2xl border border-slate-100">
                    <label className="text-[10px] font-bold text-slate-400 uppercase mb-2 block">Pick a date & time</label>
                    <input 
                      type="datetime-local" 
                      value={scheduledTime}
                      min={minScheduledTime}
                      onChange={(e) => setScheduledTime(e.target.value)}
                      className="w-full bg-white border border-slate-200 rounded-xl p-3 text-sm font-bold text-slate-800 outline-none focus:border-brand-DEFAULT focus:ring-2 focus:ring-brand-light transition-all"
                    />
                    <div className="flex gap-2 mt-3 items-start">
                        <span className="text-brand-DEFAULT text-lg">💡</span>
                        <p className="text-[10px] text-slate-500 font-medium leading-relaxed">
                            Pro Tip: Scheduling allows for <strong>"Pay Later"</strong>. You only need to pay 30 mins before the slot.
                        </p>
                    </div>
                 </div>
            )}
            
            {/* Bottom spacer to prevent content cut-off near footer */}
            <div className="h-20"></div>
         </div>

      </div>

      {/* 3. Footer Summary (Shrink 0) */}
      <div className="shrink-0 z-[60] bg-white border-t border-slate-100 px-5 pt-4 pb-8 shadow-[0_-8px_30px_rgba(0,0,0,0.08)]">
         
         {/* Price Breakdown Row */}
         <div className="flex justify-between items-start mb-4">
             <div className="space-y-1">
                 <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Total Payable</p>
                 <div className="text-3xl font-black text-slate-900 tracking-tighter">₹{onlinePayableTotal}</div>
                 
                 {/* Compact Breakdown */}
                 <div className="flex items-center gap-2 text-[10px] text-slate-500 font-medium mt-1">
                    <span>Items: ₹{itemsTotal}</span>
                    <span>•</span>
                    <span>Delivery: {isMovMet ? <span className="text-emerald-600 font-bold">FREE</span> : `₹${deliveryFee}`}</span>
                 </div>
             </div>

             {/* Savings Badge - Moved here for compactness */}
             {totalSavings > 0 && (
                 <div className="bg-emerald-50 text-emerald-700 px-3 py-1.5 rounded-lg text-[10px] font-bold flex items-center gap-1 border border-emerald-100/50">
                     <span>🎉 Saved</span>
                     <span className="font-black">₹{totalSavings}</span>
                 </div>
             )}
         </div>

         {/* Delivery Progress Bar / Free Delivery Nudge */}
         {!isMovMet && mode === 'DELIVERY' && (
            <div className="mb-4 bg-slate-50 rounded-full h-1.5 w-full overflow-hidden flex relative">
                <div className="h-full bg-brand-DEFAULT absolute left-0" style={{ width: `${(itemsTotal/MINIMUM_ORDER_VALUE)*100}%` }}></div>
                <div className="w-full text-center text-[8px] font-bold text-slate-400 absolute -top-4 right-0">
                    Add ₹{MINIMUM_ORDER_VALUE - itemsTotal} for Free Delivery
                </div>
            </div>
         )}

         {/* Action Buttons */}
         <div className="flex flex-col gap-3">
             {deliveryType === 'SCHEDULED' && isPayLaterAllowed() ? (
                 <div className="flex gap-3">
                    <button 
                        onClick={() => preparePaymentData(true)}
                        className="flex-1 py-3.5 bg-white border-2 border-slate-900 text-slate-900 rounded-2xl font-black text-xs shadow-sm hover:bg-slate-50 active:scale-[0.98] transition-all touch-manipulation"
                    >
                        Pay Later
                        <span className="block text-[8px] font-normal opacity-70 mt-0.5">Before 30 mins</span>
                    </button>
                    <button 
                        onClick={() => preparePaymentData(false)}
                        className="flex-1 py-3.5 bg-slate-900 text-white rounded-2xl font-black text-xs shadow-xl hover:bg-black active:scale-[0.98] transition-all touch-manipulation"
                    >
                        Pay Now
                    </button>
                 </div>
             ) : (
                <button 
                onClick={() => preparePaymentData(false)}
                className="w-full py-4 bg-slate-900 text-white rounded-2xl font-black text-lg shadow-green-glow hover:shadow-xl hover:bg-black active:scale-[0.98] transition-all flex items-center justify-between px-6 group touch-manipulation ring-1 ring-white/20 relative overflow-hidden"
                >
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000"></div>
                <span className="relative z-10">{deliveryType === 'SCHEDULED' ? 'Pay & Schedule' : `Pay ₹${onlinePayableTotal}`}</span>
                <span className="relative z-10 bg-white/20 p-2 rounded-full group-hover:bg-white group-hover:text-slate-900 transition-colors">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                    </svg>
                </span>
                </button>
             )}
         </div>
      </div>
    </div>
  );
};

export const CartSheet: React.FC<CartDetailsProps> = (props) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const totalItems = props.cart.reduce((acc, item) => acc + item.quantity, 0);

  if (props.cart.length === 0 && !isExpanded) return null;

  return (
    <>
      {!isExpanded && props.cart.length > 0 && (
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
             onClick={() => setIsExpanded(false)}
           />
           {/* Optimized Modal Height using Dynamic Viewport Units */}
           <div className="relative w-full h-[95dvh] bg-[#F8FAFC] rounded-t-[2.5rem] shadow-2xl overflow-hidden animate-slide-up flex flex-col">
              <CartDetails 
                {...props} 
                isPage={false} 
                onClose={() => setIsExpanded(false)} 
              />
           </div>
        </div>
      )}
    </>
  );
};
