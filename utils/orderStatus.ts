export const statusMessage = (s: string) => {
  switch (s) {
    case 'placed': return '🛒 Order placed'
    case 'accepted': return '🏪 Store accepted'
    case 'packing': return '📦 Packing items'
    case 'ready': return '✅ Ready for pickup'
    case 'on_way': return '🚴 Delivery on the way'
    case 'delivered': return '🎉 Delivered'
    default: return '⏳ Processing'
  }
}