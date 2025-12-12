
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
        <div className="w-14 h-14 bg-slate-50 rounded-2xl flex items-center justify-center text-3xl shrink-0 transition-transform duration-300 group-hover:scale-110 relative overflow-hidden shadow-inner border border-slate-100">
            <span className="emoji-real text-2xl filter drop-shadow">{item.emoji}</span>
            {savings > 0 && (
                <div className="absolute bottom-0 left-0 right-0 bg-emerald-500 text-white text-[8px] font-bold text-center py-0.5 leading-none">
                    SAVE ₹{savings}
                </div>
            )}
        </div>
        
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

interface CartDetailsProps {
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
  
  // LOGIC
  const MINIMUM_ORDER_VALUE = 1000; 
  const BASE_DELIVERY_FEE = 30;

  // Group Cart Items
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
  
  const numStores = Object.keys(groupedItems).length;
  const isMovMet = itemsTotal >= MINIMUM_ORDER_VALUE;
  const deliveryFee = mode === 'DELIVERY' ? (isMovMet ? 0 : BASE_DELIVERY_FEE * numStores) : 0;
  const onlinePayableTotal = itemsTotal + deliveryFee;

  const preparePaymentData = (isPayLater: boolean) => {
      const splits = {
          storeAmount: onlinePayableTotal, 
          storeUpi: activeStore?.upiId || 'store@upi',
          handlingFee: 0, 
          adminUpi: 'uday@admin',
          deliveryFee: deliveryFee, 
          driverUpi: 'driver@upi'
      };
      onProceedToPay({ deliveryType, scheduledTime, isPayLater, splits });
  };

  const cartStoreIds = Object.keys(groupedItems);
  const cartStoresForMap = stores.filter(s => cartStoreIds.includes(s.id));
  const mapStores = cartStoresForMap.length > 0 ? cartStoresForMap : (activeStore ? [activeStore] : []);

  // Icon Helper
  const getStoreIcon = (type: string) => {
      if (type === 'produce') return <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" /></svg>;
      if (type === 'dairy') return <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.384-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" /></svg>;
      return <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-orange-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>;
  };

  return (
    <div className={`flex flex-col h-full relative ${isPage ? 'bg-[#F8FAFC]' : 'bg-[#F8FAFC]'}`}>
      
      {/* 1. Header Section */}
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

      {/* 2. Scrollable Content */}
      <div className="flex-1 overflow-y-auto px-5 py-6 hide-scrollbar space-y-8"> 
         <div className="rounded-[2.5rem] overflow-hidden shadow-card border-[3px] border-white h-48 relative ring-1 ring-slate-100 shrink-0">
            <MapVisualizer 
                stores={mapStores}
                userLat={userLocation?.lat || 0}
                userLng={userLocation?.lng || 0}
                selectedStore={activeStore} 
                onSelectStore={() => {}}
                mode={mode}
                showRoute={true} 
                enableExternalNavigation={mode === 'PICKUP'} 
                className="h-full"
            />
         </div>

         <div className="space-y-6">
           {Object.entries(groupedItems).map(([storeId, items]: [string, CartItem[]]) => {
              const storeInfo = items[0]; 
              return (
                  <div key={storeId} className="animate-fade-in-up">
                      <div className={`flex items-center gap-3 mb-3 px-2 py-1`}>
                           <div className={`w-8 h-8 rounded-full flex items-center justify-center text-lg shadow-sm bg-white border border-slate-100`}>
                               {getStoreIcon(storeInfo.storeType)}
                           </div>
                           <div className="flex-1">
                               <h3 className="font-black text-slate-800 text-sm leading-none">{storeInfo.storeName}</h3>
                               <p className="text-[10px] text-slate-400 font-bold uppercase mt-1">
                                   Near You • {storeInfo.storeType}
                               </p>
                           </div>
                      </div>
                      <div className="bg-white p-2 rounded-[2rem] shadow-card border border-slate-100">
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
                      </div>
                  </div>
              );
           })}
         </div>

         <div className="bg-white p-6 rounded-[2.5rem] shadow-card border border-slate-100 space-y-8 animate-fade-in relative z-0">
            <div>
                 <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 block px-2">Order Type</label>
                 <div className="bg-slate-100 p-1.5 rounded-[1.5rem] flex relative">
                    <div className={`absolute top-1.5 bottom-1.5 w-[calc(50%-6px)] bg-white rounded-[1.2rem] shadow-md transition-all duration-300 ease-out ${mode === 'PICKUP' ? 'translate-x-[100%] ml-1.5' : 'translate-x-0'}`}></div>
                    <button onClick={() => onModeChange('DELIVERY')} className={`flex-1 py-3.5 rounded-[1.2rem] text-xs font-black uppercase tracking-wide transition-colors relative z-10 ${mode === 'DELIVERY' ? 'text-slate-900' : 'text-slate-400 hover:text-slate-600'}`}>Delivery</button>
                    <button onClick={() => onModeChange('PICKUP')} className={`flex-1 py-3.5 rounded-[1.2rem] text-xs font-black uppercase tracking-wide transition-colors relative z-10 ${mode === 'PICKUP' ? 'text-slate-900' : 'text-slate-400 hover:text-slate-600'}`}>Pickup</button>
                </div>
            </div>

            {mode === 'DELIVERY' && (
                <div>
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 block px-2">Address</label>
                    <textarea
                        value={deliveryAddress}
                        onChange={(e) => onAddressChange(e.target.value)}
                        placeholder="Enter delivery address..."
                        className="w-full bg-slate-50 border border-slate-200 rounded-[1.5rem] p-5 text-sm font-bold text-slate-800 outline-none focus:ring-4 focus:ring-brand-light transition-all"
                        rows={3}
                    />
                </div>
            )}
            
            <div className="h-20"></div>
         </div>
      </div>

      {/* 3. Footer Summary */}
      <div className="shrink-0 z-[60] bg-white border-t border-slate-100 px-5 pt-4 pb-8 shadow-[0_-8px_30px_rgba(0,0,0,0.08)]">
         <div className="flex justify-between items-start mb-4">
             <div className="space-y-1">
                 <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Total Payable</p>
                 <div className="text-3xl font-black text-slate-900 tracking-tighter">₹{onlinePayableTotal}</div>
                 <div className="flex items-center gap-2 text-[10px] text-slate-500 font-medium mt-1">
                    <span>Items: ₹{itemsTotal}</span>
                    <span>•</span>
                    <span>Delivery: {isMovMet ? <span className="text-emerald-600 font-bold">FREE</span> : `₹${deliveryFee}`}</span>
                 </div>
             </div>
         </div>

         <button 
            onClick={() => preparePaymentData(false)}
            className="w-full py-4 bg-slate-900 text-white rounded-2xl font-black text-lg shadow-xl hover:bg-black active:scale-[0.98] transition-all flex items-center justify-between px-6"
         >
            <span>Pay ₹{onlinePayableTotal}</span>
            <span>➔</span>
         </button>
      </div>
    </div>
  );
};

export const CartSheet: React.FC<CartDetailsProps> = (props) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const totalItems = props.cart.reduce((acc, item) => acc + item.quantity, 0);
  const totalPrice = props.cart.reduce((acc, item) => acc + (item.price * item.quantity), 0);

  if (props.cart.length === 0 && !isExpanded) return null;

  return (
    <>
      {!isExpanded && props.cart.length > 0 && (
        <div className="fixed bottom-20 left-4 right-4 z-[45] animate-scale-in">
            <div 
                onClick={() => setIsExpanded(true)}
                className="bg-slate-900 text-white p-3 rounded-2xl shadow-xl flex items-center justify-between cursor-pointer active:scale-95 transition-transform border border-slate-700/50 backdrop-blur-md"
            >
                <div className="flex items-center gap-3">
                    <div className="bg-brand-DEFAULT w-10 h-10 rounded-xl flex items-center justify-center font-black text-white text-sm border-2 border-slate-800">
                        {totalItems}
                    </div>
                    <div className="flex flex-col">
                        <span className="text-xs font-bold text-slate-300 uppercase tracking-wide">Total</span>
                        <span className="text-lg font-black leading-none">₹{totalPrice}</span>
                    </div>
                </div>
                <div className="flex items-center gap-2 pr-2">
                    <span className="text-xs font-bold">View Cart</span>
                    <div className="w-6 h-6 bg-white/20 rounded-full flex items-center justify-center">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" viewBox="0 0 20 20" fill="currentColor">
                           <path fillRule="evenodd" d="M14.707 12.707a1 1 0 01-1.414 0L10 9.414l-3.293 3.293a1 1 0 01-1.414-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 010 1.414z" clipRule="evenodd" />
                        </svg>
                    </div>
                </div>
            </div>
        </div>
      )}

      {isExpanded && (
        <div className="fixed inset-0 z-[70] flex flex-col justify-end isolate">
           <div 
             className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity animate-fade-in"
             onClick={() => setIsExpanded(false)}
           />
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
