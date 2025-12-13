
import React, { useEffect, useState } from 'react';
import { SavedCard } from '../types';

interface PaymentGatewayProps {
  amount: number;
  onSuccess: () => void;
  onCancel: () => void;
  isDemo: boolean;
  splits?: {
      storeAmount: number;
      storeUpi: string;
      handlingFee: number;
      adminUpi: string;
      deliveryFee: number;
      driverUpi: string;
  };
  savedCards?: SavedCard[];
  onSavePaymentMethod?: (method: SavedCard) => void;
}

export const PaymentGateway: React.FC<PaymentGatewayProps> = ({ 
  amount, onSuccess, onCancel, isDemo, splits, savedCards = [], onSavePaymentMethod 
}) => {
  const [step, setStep] = useState<'CONNECTING' | 'SELECT' | 'PROCESSING' | 'SUCCESS'>('CONNECTING');
  const [selectedMethod, setSelectedMethod] = useState<string>('');
  
  // Input States
  const [upiId, setUpiId] = useState('');
  const [cardNumber, setCardNumber] = useState('');
  const [cardExpiry, setCardExpiry] = useState('');
  const [cardCvv, setCardCvv] = useState('');
  const [cardName, setCardName] = useState('');
  const [selectedBank, setSelectedBank] = useState('');
  const [saveMethod, setSaveMethod] = useState(true);

  // Initialize selected method
  useEffect(() => {
    // Simulate initial connection
    const timer = setTimeout(() => {
        if (savedCards.length > 0) {
            setSelectedMethod(savedCards[0].id);
        } else {
            setSelectedMethod('upi_new');
        }
        setStep('SELECT');
    }, 1500);
    return () => clearTimeout(timer);
  }, [savedCards]);

  const handlePay = () => {
    setStep('PROCESSING');
    
    // Simulate Payment Processing Time
    setTimeout(() => {
        // Save method if requested
        if (saveMethod && onSavePaymentMethod) {
            if (selectedMethod === 'upi_new' && upiId) {
                onSavePaymentMethod({
                    id: `saved_upi_${Date.now()}`,
                    type: 'UPI',
                    upiId: upiId,
                    label: 'My UPI ID'
                });
            } else if (selectedMethod === 'card_new' && cardNumber) {
                const type = cardNumber.startsWith('4') ? 'VISA' : 'MASTERCARD';
                onSavePaymentMethod({
                    id: `saved_card_${Date.now()}`,
                    type: type,
                    last4: cardNumber.slice(-4),
                    label: 'Personal Card'
                });
            }
        }

        if (isDemo) {
            setStep('SUCCESS');
            // Auto-close after 2.5s for demo
            setTimeout(onSuccess, 2500);
        } else {
            // In real app, trigger actual PG SDK here
            // For now, simulate success
            setStep('SUCCESS');
        }
    }, 2000);
  };

  const getMethodIcon = (type: string) => {
      switch(type) {
          case 'VISA': return '💳';
          case 'MASTERCARD': return '💳';
          case 'UPI': return '📱';
          default: return '💰';
      }
  };

  const renderPaymentContent = () => {
      if (step === 'CONNECTING') {
          return (
            <div className="text-center py-20">
                <div className="w-12 h-12 border-4 border-gray-300 border-t-brand-DEFAULT rounded-full animate-spin mx-auto mb-4"></div>
                <p className="text-gray-500 font-bold animate-pulse">Securing Connection...</p>
            </div>
          );
      }

      if (step === 'PROCESSING') {
          return (
             <div className="text-center bg-white p-8 rounded-[2rem] shadow-xl max-w-xs w-full mx-auto">
                <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center text-3xl mx-auto border-4 border-blue-100 animate-pulse mb-6">
                    💸
                </div>
                <h3 className="text-xl font-bold text-slate-800 mb-2">Processing Payment</h3>
                <p className="text-xs text-slate-500 mb-6">Please do not press back or refresh.</p>
                <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                    <div className="h-full bg-blue-500 animate-[width_2s_ease-in-out_infinite] w-1/2"></div>
                </div>
             </div>
          );
      }

      if (step === 'SUCCESS') {
        return (
          <div className="fixed inset-0 z-[100] bg-emerald-600 flex flex-col items-center justify-center text-white animate-fade-in">
            <div className="w-24 h-24 bg-white rounded-full flex items-center justify-center mb-6 animate-bounce shadow-xl">
              <svg className="w-12 h-12 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h2 className="text-3xl font-black mb-2 text-center">Payment Successful!</h2>
            <p className="text-white/90 font-medium text-center max-w-xs mb-8">
                Your order has been placed successfully.
            </p>
            <button 
                onClick={onSuccess}
                className="bg-white/20 hover:bg-white/30 text-white border border-white/40 px-6 py-2 rounded-full text-sm font-bold backdrop-blur-md transition-all"
            >
                Continue to App
            </button>
          </div>
        );
      }

      // SELECT STEP
      return (
          <div className="flex flex-col h-full bg-slate-50">
              {/* Header */}
              <div className="bg-white p-6 pb-8 shadow-sm border-b border-slate-100 relative z-10">
                  <div className="flex justify-between items-center mb-4">
                      <div className="flex items-center gap-2">
                          <span className="w-2 h-6 bg-brand-DEFAULT rounded-full"></span>
                          <h2 className="text-lg font-black text-slate-800 uppercase tracking-wide">Total Payable</h2>
                      </div>
                      <div className="text-3xl font-black text-slate-900 tracking-tight">₹{amount}</div>
                  </div>
                  {splits && (
                      <div className="flex gap-2 text-[10px] font-bold text-slate-400 uppercase bg-slate-50 p-2 rounded-lg justify-between">
                          <span>Store: ₹{splits.storeAmount}</span>
                          {splits.deliveryFee > 0 && <span>Delivery: ₹{splits.deliveryFee}</span>}
                          {splits.handlingFee > 0 && <span>Fees: ₹{splits.handlingFee}</span>}
                      </div>
                  )}
              </div>

              {/* Methods List */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4 pb-32">
                  
                  {/* Saved Methods */}
                  {savedCards.length > 0 && (
                      <div className="space-y-2">
                          <h3 className="text-xs font-black text-slate-400 uppercase ml-2">Saved Methods</h3>
                          {savedCards.map(card => (
                              <div 
                                key={card.id}
                                onClick={() => setSelectedMethod(card.id)}
                                className={`p-4 rounded-2xl border-2 cursor-pointer transition-all flex items-center gap-4 ${selectedMethod === card.id ? 'border-brand-DEFAULT bg-white shadow-md' : 'border-slate-200 bg-white hover:border-slate-300'}`}
                              >
                                  <div className="text-2xl">{getMethodIcon(card.type)}</div>
                                  <div className="flex-1">
                                      <p className="font-bold text-slate-800 text-sm">{card.label}</p>
                                      <p className="text-xs text-slate-500 font-mono">
                                          {card.type === 'UPI' ? card.upiId : `**** ${card.last4}`}
                                      </p>
                                  </div>
                                  <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${selectedMethod === card.id ? 'border-brand-DEFAULT' : 'border-slate-300'}`}>
                                      {selectedMethod === card.id && <div className="w-2.5 h-2.5 bg-brand-DEFAULT rounded-full" />}
                                  </div>
                              </div>
                          ))}
                      </div>
                  )}

                  <h3 className="text-xs font-black text-slate-400 uppercase ml-2 mt-4">Add New Method</h3>

                  {/* UPI NEW */}
                  <div 
                    className={`bg-white rounded-2xl overflow-hidden border-2 transition-all ${selectedMethod === 'upi_new' ? 'border-brand-DEFAULT shadow-md' : 'border-slate-200'}`}
                  >
                      <div 
                        className="p-4 flex items-center gap-4 cursor-pointer"
                        onClick={() => setSelectedMethod('upi_new')}
                      >
                          <div className="text-2xl">📱</div>
                          <div className="flex-1 font-bold text-slate-800 text-sm">Add New UPI ID</div>
                          <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${selectedMethod === 'upi_new' ? 'border-brand-DEFAULT' : 'border-slate-300'}`}>
                              {selectedMethod === 'upi_new' && <div className="w-2.5 h-2.5 bg-brand-DEFAULT rounded-full" />}
                          </div>
                      </div>
                      
                      {selectedMethod === 'upi_new' && (
                          <div className="p-4 pt-0 bg-slate-50/50 border-t border-slate-100 animate-fade-in">
                              <input 
                                  type="text" 
                                  placeholder="Enter UPI ID (e.g. user@okhdfc)" 
                                  value={upiId}
                                  onChange={(e) => setUpiId(e.target.value)}
                                  className="w-full p-3 rounded-xl border border-slate-200 text-sm font-bold outline-none focus:border-brand-DEFAULT mb-3"
                              />
                              <label className="flex items-center gap-2 cursor-pointer">
                                  <input 
                                    type="checkbox" 
                                    checked={saveMethod} 
                                    onChange={(e) => setSaveMethod(e.target.checked)} 
                                    className="w-4 h-4 text-brand-DEFAULT rounded" 
                                  />
                                  <span className="text-xs font-bold text-slate-500">Securely save this VPA for future</span>
                              </label>
                          </div>
                      )}
                  </div>

                  {/* CARD NEW */}
                  <div 
                    className={`bg-white rounded-2xl overflow-hidden border-2 transition-all ${selectedMethod === 'card_new' ? 'border-brand-DEFAULT shadow-md' : 'border-slate-200'}`}
                  >
                      <div 
                        className="p-4 flex items-center gap-4 cursor-pointer"
                        onClick={() => setSelectedMethod('card_new')}
                      >
                          <div className="text-2xl">💳</div>
                          <div className="flex-1 font-bold text-slate-800 text-sm">Credit / Debit Card</div>
                          <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${selectedMethod === 'card_new' ? 'border-brand-DEFAULT' : 'border-slate-300'}`}>
                              {selectedMethod === 'card_new' && <div className="w-2.5 h-2.5 bg-brand-DEFAULT rounded-full" />}
                          </div>
                      </div>
                      
                      {selectedMethod === 'card_new' && (
                          <div className="p-4 pt-0 bg-slate-50/50 border-t border-slate-100 animate-fade-in space-y-3">
                              <input 
                                  type="text" 
                                  placeholder="Card Number" 
                                  value={cardNumber}
                                  onChange={(e) => setCardNumber(e.target.value.replace(/\D/g,'').slice(0, 16))}
                                  className="w-full p-3 rounded-xl border border-slate-200 text-sm font-bold outline-none focus:border-brand-DEFAULT"
                              />
                              <div className="flex gap-3">
                                  <input 
                                      type="text" 
                                      placeholder="MM/YY" 
                                      value={cardExpiry}
                                      onChange={(e) => setCardExpiry(e.target.value)}
                                      className="flex-1 p-3 rounded-xl border border-slate-200 text-sm font-bold outline-none focus:border-brand-DEFAULT"
                                  />
                                  <input 
                                      type="password" 
                                      placeholder="CVV" 
                                      value={cardCvv}
                                      onChange={(e) => setCardCvv(e.target.value.slice(0, 3))}
                                      className="w-24 p-3 rounded-xl border border-slate-200 text-sm font-bold outline-none focus:border-brand-DEFAULT"
                                  />
                              </div>
                              <input 
                                  type="text" 
                                  placeholder="Name on Card" 
                                  value={cardName}
                                  onChange={(e) => setCardName(e.target.value)}
                                  className="w-full p-3 rounded-xl border border-slate-200 text-sm font-bold outline-none focus:border-brand-DEFAULT"
                              />
                              <label className="flex items-center gap-2 cursor-pointer">
                                  <input 
                                    type="checkbox" 
                                    checked={saveMethod} 
                                    onChange={(e) => setSaveMethod(e.target.checked)} 
                                    className="w-4 h-4 text-brand-DEFAULT rounded" 
                                  />
                                  <span className="text-xs font-bold text-slate-500">Save card securely</span>
                              </label>
                          </div>
                      )}
                  </div>

                  {/* NET BANKING */}
                  <div 
                    className={`bg-white rounded-2xl overflow-hidden border-2 transition-all ${selectedMethod === 'net_banking' ? 'border-brand-DEFAULT shadow-md' : 'border-slate-200'}`}
                  >
                      <div 
                        className="p-4 flex items-center gap-4 cursor-pointer"
                        onClick={() => setSelectedMethod('net_banking')}
                      >
                          <div className="text-2xl">🏦</div>
                          <div className="flex-1 font-bold text-slate-800 text-sm">Net Banking</div>
                          <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${selectedMethod === 'net_banking' ? 'border-brand-DEFAULT' : 'border-slate-300'}`}>
                              {selectedMethod === 'net_banking' && <div className="w-2.5 h-2.5 bg-brand-DEFAULT rounded-full" />}
                          </div>
                      </div>
                      
                      {selectedMethod === 'net_banking' && (
                          <div className="p-4 pt-0 bg-slate-50/50 border-t border-slate-100 animate-fade-in">
                              <select 
                                value={selectedBank}
                                onChange={(e) => setSelectedBank(e.target.value)}
                                className="w-full p-3 rounded-xl border border-slate-200 text-sm font-bold outline-none focus:border-brand-DEFAULT bg-white"
                              >
                                  <option value="">Select Bank</option>
                                  <option value="HDFC">HDFC Bank</option>
                                  <option value="SBI">State Bank of India</option>
                                  <option value="ICICI">ICICI Bank</option>
                                  <option value="AXIS">Axis Bank</option>
                              </select>
                          </div>
                      )}
                  </div>

              </div>

              {/* Pay Button Footer */}
              <div className="p-4 border-t border-slate-200 bg-white">
                  <button 
                    onClick={handlePay}
                    disabled={
                        (selectedMethod === 'upi_new' && !upiId) || 
                        (selectedMethod === 'card_new' && (!cardNumber || !cardCvv)) ||
                        (selectedMethod === 'net_banking' && !selectedBank)
                    }
                    className="w-full bg-slate-900 text-white font-black py-4 rounded-xl shadow-lg hover:bg-black active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                      <span>Pay ₹{amount}</span>
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-8.707l-3-3a1 1 0 00-1.414 1.414L10.586 9H7a1 1 0 100 2h3.586l-1.293 1.293a1 1 0 101.414 1.414l3-3a1 1 0 000-1.414z" clipRule="evenodd" />
                      </svg>
                  </button>
              </div>
          </div>
      );
  };

  return (
    <div className="fixed inset-0 z-[100] bg-gray-100 flex flex-col animate-fade-in">
      {/* Fake Browser Bar */}
      <div className="bg-gray-800 p-3 flex items-center gap-3 shadow-md z-50">
        <button onClick={onCancel} className="text-gray-400 hover:text-white">✕</button>
        <div className="flex-1 bg-gray-700 rounded-lg px-4 py-2 text-xs text-green-400 font-mono flex items-center gap-2">
          <span className="text-gray-400">🔒</span> https://secure-payments.bank-gateway.com
        </div>
      </div>

      <div className="flex-1 flex flex-col relative overflow-hidden">
          {renderPaymentContent()}
      </div>
    </div>
  );
};
