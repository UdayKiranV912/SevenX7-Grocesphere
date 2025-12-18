
import React from 'react';
import { useStore } from '../contexts/StoreContext';
import { MyOrders } from '../components/MyOrders';
import { Order } from '../types';

interface OrdersPageProps {
  onPayNow?: (order: Order) => void;
}

export const OrdersPage: React.FC<OrdersPageProps> = ({ onPayNow }) => {
  const { user } = useStore();
  
  return (
    <MyOrders 
        userLocation={user.location} 
        userId={user.id}
        onPayNow={onPayNow}
    />
  );
};
